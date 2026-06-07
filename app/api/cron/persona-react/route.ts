/**
 * POST /api/cron/persona-react
 * AIペルソナが公開フィードの投稿にいいねする。
 * - 性格タグから「いいね率」を決定
 * - 興味キーワードが一致する投稿は確率アップ
 * - 自分の投稿にいいねしてくれたユーザーにはフォローバック意図でいいね率アップ
 * persona-post から ~10% の確率で呼び出される（≒50分に1回）
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PERSONA_MAP } from "@/data/personas";
import type { PersonaConfig } from "@/data/personas";

// ──────────────────────────────────────────
// 性格 → いいね率
// ──────────────────────────────────────────

const GENEROUS_TAGS = ["散財", "衝動買い", "ファッション", "カフェ好き"];
const ACTIVE_TAGS   = ["アウトドア", "スポーツ", "美容"];
const STINGY_TAGS   = ["節約家", "慎重", "伝統的"];
const CAREFUL_TAGS  = ["計画的", "実用主義", "節約意識あり"];

function getBaseLikeRate(personalityTags: string[]): number {
  if (personalityTags.some((t) => GENEROUS_TAGS.includes(t))) return 0.65;
  if (personalityTags.some((t) => ACTIVE_TAGS.includes(t)))   return 0.5;
  if (personalityTags.some((t) => STINGY_TAGS.includes(t)))   return 0.12;
  if (personalityTags.some((t) => CAREFUL_TAGS.includes(t)))  return 0.2;
  return 0.35;
}

// ──────────────────────────────────────────
// 性格 → 興味キーワード
// ──────────────────────────────────────────

const INTEREST_MAP: Record<string, string[]> = {
  "散財":                      ["外食", "ランチ", "ガジェット", "買い物", "ショッピング"],
  "衝動買い":                   ["外食", "ショッピング", "買い物"],
  "アウトドア":                  ["キャンプ", "釣り", "登山", "アウトドア", "スポーツ"],
  "スポーツ":                   ["スポーツ", "ジム", "ランニング", "フィットネス"],
  "ファッション":                ["洋服", "コスメ", "ショッピング", "ブランド"],
  "美容":                       ["美容院", "コスメ", "スキンケア", "エステ", "ネイル"],
  "カフェ好き":                  ["カフェ", "コーヒー", "スイーツ", "ブランチ"],
  "節約家":                     ["スーパー", "節約", "コスパ", "割引", "半額"],
  "IT系":                       ["ガジェット", "サブスク", "アプリ", "PC", "スマホ"],
  "仕事熱心":                   ["ランチ", "コーヒー", "勉強", "書籍"],
  "趣味散財（アニメ・ゲーム）":  ["アニメ", "ゲーム", "漫画", "グッズ"],
  "趣味散財（園芸・釣り）":      ["釣り", "園芸", "植木", "花", "種"],
  "子育て":                     ["子供", "学校", "習い事", "おもちゃ"],
};

function getInterestKeywords(personaKey: string, personalityTags: string[]): string[] {
  const staticDef = PERSONA_MAP.get(personaKey);
  if (staticDef) return staticDef.tagPool;
  const keywords: string[] = [];
  for (const tag of personalityTags) {
    keywords.push(...(INTEREST_MAP[tag] ?? []));
  }
  return [...new Set(keywords)];
}

function matchesInterests(description: string, tags: string[], interests: string[]): boolean {
  if (interests.length === 0) return false;
  const haystack = (description + " " + tags.join(" ")).toLowerCase();
  return interests.some((kw) => haystack.includes(kw.toLowerCase()));
}

// ──────────────────────────────────────────
// メインハンドラー
// ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const MAX_LIKES_PER_PERSONA = 12;

  // アクティブなペルソナ一覧
  const personas = await prisma.personaProfile.findMany({
    where: { activatedAt: { lte: new Date() } },
    include: {
      user: { select: { id: true } },
    },
  });
  if (personas.length === 0) return NextResponse.json({ liked: 0 });

  const personaUserIds = personas.map((p) => p.user.id);

  // 公開サークルの直近24h投稿
  const [candidateExpenses, candidateIncomes] = await Promise.all([
    prisma.expense.findMany({
      where: { createdAt: { gte: since24h }, circle: { isPublic: true } },
      select: { id: true, circleId: true, userId: true, description: true, tags: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.income.findMany({
      where: { createdAt: { gte: since24h }, circle: { isPublic: true } },
      select: { id: true, circleId: true, userId: true, description: true, tags: true },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
  ]);

  // ペルソナの直近48h投稿（フォローバック用）
  const [personaExpenses, personaIncomes] = await Promise.all([
    prisma.expense.findMany({
      where: { userId: { in: personaUserIds }, createdAt: { gte: since48h } },
      select: { id: true, userId: true },
    }),
    prisma.income.findMany({
      where: { userId: { in: personaUserIds }, createdAt: { gte: since48h } },
      select: { id: true, userId: true },
    }),
  ]);

  // ペルソナ投稿のtargetId → personaUserId マップ
  const targetToPersona = new Map<string, string>();
  for (const e of personaExpenses) targetToPersona.set(e.id, e.userId);
  for (const i of personaIncomes)  targetToPersona.set(i.id, i.userId);

  // ペルソナ投稿にいいねしたユーザー（フォローバック対象）
  const personaPostIds = [...targetToPersona.keys()];
  const reactionsOnPersonaPosts = personaPostIds.length > 0
    ? await prisma.reaction.findMany({
        where: {
          targetId: { in: personaPostIds },
          type: "GOOD",
          userId: { notIn: personaUserIds },
          createdAt: { gte: since48h },
        },
        select: { userId: true, targetId: true },
      })
    : [];

  // personaUserId → Set<likerUserId>
  const followBackMap = new Map<string, Set<string>>();
  for (const r of reactionsOnPersonaPosts) {
    const personaUserId = targetToPersona.get(r.targetId);
    if (!personaUserId) continue;
    if (!followBackMap.has(personaUserId)) followBackMap.set(personaUserId, new Set());
    followBackMap.get(personaUserId)!.add(r.userId);
  }

  // 既存のいいね済みセット（全ペルソナ分を一括取得）
  const existingReactions = await prisma.reaction.findMany({
    where: { userId: { in: personaUserIds }, type: "GOOD" },
    select: { userId: true, targetType: true, targetId: true },
  });
  const reactedSet = new Set(existingReactions.map((r) => `${r.userId}:${r.targetType}:${r.targetId}`));

  let totalLiked = 0;
  const results: string[] = [];

  for (const persona of personas) {
    const userId = persona.user.id;
    const storedConfig = persona.personaConfig as PersonaConfig | null;
    const staticDef = PERSONA_MAP.get(persona.personaKey);
    const personalityTags: string[] = storedConfig?.personalityTags ?? staticDef?.personalityTags ?? [];

    const baseRate = getBaseLikeRate(personalityTags);
    const interests = getInterestKeywords(persona.personaKey, personalityTags);
    const followBackUserIds = followBackMap.get(userId) ?? new Set<string>();

    let likedCount = 0;

    // 候補投稿をシャッフルして処理
    const candidates: { id: string; targetType: "expense" | "income"; circleId: string; postUserId: string; description: string; tags: string[] }[] = [
      ...candidateExpenses.map((e) => ({ id: e.id, targetType: "expense" as const, circleId: e.circleId, postUserId: e.userId, description: e.description, tags: e.tags })),
      ...candidateIncomes.map((i) => ({ id: i.id, targetType: "income" as const, circleId: i.circleId, postUserId: i.userId, description: i.description, tags: i.tags })),
    ].sort(() => Math.random() - 0.5);

    const reactionsToCreate: { userId: string; targetType: string; targetId: string; type: "GOOD" }[] = [];

    for (const post of candidates) {
      if (likedCount >= MAX_LIKES_PER_PERSONA) break;
      // 自分の投稿はスキップ
      if (post.postUserId === userId) continue;
      // 既にいいね済みはスキップ
      if (reactedSet.has(`${userId}:${post.targetType}:${post.id}`)) continue;

      // レート計算
      let rate = baseRate;
      if (matchesInterests(post.description, post.tags, interests)) rate = Math.min(rate + 0.2, 0.85);
      if (followBackUserIds.has(post.postUserId)) rate = Math.min(rate + 0.3, 0.9);

      if (Math.random() < rate) {
        reactionsToCreate.push({ userId, targetType: post.targetType, targetId: post.id, type: "GOOD" });
        reactedSet.add(`${userId}:${post.targetType}:${post.id}`);
        likedCount++;
      }
    }

    if (reactionsToCreate.length > 0) {
      await prisma.reaction.createMany({ data: reactionsToCreate, skipDuplicates: true });
      totalLiked += reactionsToCreate.length;
      results.push(`${persona.personaKey}(rate=${baseRate.toFixed(2)}): +${reactionsToCreate.length}`);
    }
  }

  console.log(JSON.stringify({ job: "persona-react", totalLiked, results }));
  return NextResponse.json({ totalLiked, results });
}
