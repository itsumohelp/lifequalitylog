/**
 * POST /api/cron/persona-react
 * AIペルソナが公開フィードの投稿にいいねする。5分毎に呼ばれるが、
 * 「日次予算」でペルソナごとの自然な上限を保つ。
 *
 * 性格タイプ別の1日あたりいいね上限:
 *   散財/ファッション系  → 25件
 *   アウトドア/美容系   → 18件
 *   普通/IT/仕事系     → 12件
 *   計画的/実用主義     → 8件
 *   節約家/慎重/伝統的  → 5件
 *
 * 1回あたりの上限は3件に抑え、予算内でも確率的に動くため自然に見える。
 * フォローバック：自分の投稿にいいねしてくれたユーザーの投稿は+30%ブースト。
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PERSONA_MAP } from "@/data/personas";
import type { PersonaConfig } from "@/data/personas";

// ──────────────────────────────────────────
// 性格タググループ
// ──────────────────────────────────────────

const GENEROUS_TAGS = ["散財", "衝動買い", "ファッション", "カフェ好き", "社交的", "おしゃれ", "グルメ"];
const ACTIVE_TAGS   = ["アウトドア", "スポーツ", "美容", "旅行好き", "健康志向", "アクティブ"];
const STINGY_TAGS   = ["節約家", "慎重", "伝統的", "倹約家", "シンプル志向"];
const CAREFUL_TAGS  = ["計画的", "実用主義", "節約意識あり", "堅実", "分析的"];

// ──────────────────────────────────────────
// 性格 → 日次いいね予算 & 1回の基本率
// ──────────────────────────────────────────

function getPersonalityProfile(personalityTags: string[]): { dailyBudget: number; baseRate: number } {
  if (personalityTags.some((t) => GENEROUS_TAGS.includes(t))) return { dailyBudget: 25, baseRate: 0.65 };
  if (personalityTags.some((t) => ACTIVE_TAGS.includes(t)))   return { dailyBudget: 18, baseRate: 0.5 };
  if (personalityTags.some((t) => STINGY_TAGS.includes(t)))   return { dailyBudget: 5,  baseRate: 0.12 };
  if (personalityTags.some((t) => CAREFUL_TAGS.includes(t)))  return { dailyBudget: 8,  baseRate: 0.2 };
  return { dailyBudget: 12, baseRate: 0.35 };
}

// ──────────────────────────────────────────
// 性格タグ → 興味キーワード（静的・動的ペルソナ共通）
// ──────────────────────────────────────────

const INTEREST_MAP: Record<string, string[]> = {
  // 静的ペルソナ定義と一致するタグ
  "散財":                      ["外食", "ランチ", "ガジェット", "買い物", "ショッピング", "居酒屋"],
  "衝動買い":                   ["外食", "ショッピング", "買い物", "コンビニ"],
  "アウトドア":                  ["キャンプ", "釣り", "登山", "アウトドア", "スポーツ", "ハイキング"],
  "スポーツ":                   ["スポーツ", "ジム", "ランニング", "フィットネス", "プロテイン"],
  "ファッション":                ["洋服", "コスメ", "ショッピング", "ブランド", "アクセサリー"],
  "美容":                       ["美容院", "コスメ", "スキンケア", "エステ", "ネイル"],
  "カフェ好き":                  ["カフェ", "コーヒー", "スイーツ", "ブランチ", "紅茶"],
  "節約家":                     ["スーパー", "節約", "コスパ", "割引", "半額", "セール"],
  "IT系":                       ["ガジェット", "サブスク", "アプリ", "PC", "スマホ", "技術書"],
  "サブスク多め":                ["サブスク", "Netflix", "Spotify", "Amazon"],
  "仕事熱心":                   ["ランチ", "コーヒー", "勉強", "書籍", "セミナー"],
  "趣味散財（アニメ・ゲーム）":  ["アニメ", "ゲーム", "漫画", "グッズ", "フィギュア"],
  "趣味散財（園芸・釣り）":      ["釣り", "園芸", "植木", "花", "種"],
  "中〜高支出":                  ["外食", "旅行", "ホテル", "レストラン"],
  // 動的ペルソナ向け追加タグ
  "社交的":                     ["外食", "飲み会", "カフェ", "パーティー", "交流"],
  "グルメ":                     ["外食", "レストラン", "ランチ", "料理", "食材"],
  "旅行好き":                   ["旅行", "ホテル", "交通費", "観光", "土産"],
  "健康志向":                   ["ジム", "スポーツ", "オーガニック", "サプリ", "ヨガ"],
  "アクティブ":                  ["スポーツ", "外出", "アウトドア", "旅行"],
  "倹約家":                     ["スーパー", "節約", "コスパ", "まとめ買い"],
  "堅実":                       ["スーパー", "公共料金", "保険", "定期"],
  "おしゃれ":                   ["洋服", "コスメ", "美容院", "アクセサリー"],
  "子育て中":                   ["子供", "学校", "習い事", "おもちゃ", "給食"],
  "インドア":                   ["ゲーム", "本", "映画", "デリバリー", "サブスク"],
  "料理好き":                   ["食材", "スーパー", "調味料", "キッチン用品"],
  "読書家":                     ["本", "書籍", "電子書籍", "図書館"],
};

function getInterestKeywords(personaKey: string, personalityTags: string[]): string[] {
  // 静的ペルソナはtagPoolをそのまま使う
  const staticDef = PERSONA_MAP.get(personaKey);
  if (staticDef) return staticDef.tagPool;
  // 動的ペルソナはINTEREST_MAPから導出
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

const MAX_LIKES_PER_RUN = 3; // 5分毎に最大3件（あからさまにならない）

export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000);
  const since48h = new Date(now - 48 * 60 * 60 * 1000);

  // JST今日の起点（日次予算計算用）
  const jstNow = new Date(now + 9 * 60 * 60 * 1000);
  const startOfJstDay = new Date(
    Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate()) - 9 * 60 * 60 * 1000,
  );

  const personas = await prisma.personaProfile.findMany({
    where: { activatedAt: { lte: new Date() } },
    include: { user: { select: { id: true } } },
  });
  if (personas.length === 0) return NextResponse.json({ totalLiked: 0 });

  const personaUserIds = personas.map((p) => p.user.id);

  // ── 候補投稿（公開サークル・直近24h） ──
  const [candidateExpenses, candidateIncomes] = await Promise.all([
    prisma.expense.findMany({
      where: { createdAt: { gte: since24h }, circle: { isPublic: true } },
      select: { id: true, circleId: true, userId: true, description: true, tags: true },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.income.findMany({
      where: { createdAt: { gte: since24h }, circle: { isPublic: true } },
      select: { id: true, circleId: true, userId: true, description: true, tags: true },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
  ]);

  // ── フォローバック：ペルソナ投稿へのいいね（48h以内） ──
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
  const targetToPersona = new Map<string, string>();
  for (const e of personaExpenses) targetToPersona.set(e.id, e.userId);
  for (const i of personaIncomes)  targetToPersona.set(i.id, i.userId);

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
    const pUid = targetToPersona.get(r.targetId);
    if (!pUid) continue;
    if (!followBackMap.has(pUid)) followBackMap.set(pUid, new Set());
    followBackMap.get(pUid)!.add(r.userId);
  }

  // ── 既存いいね済みセット ──
  const existingReactions = await prisma.reaction.findMany({
    where: { userId: { in: personaUserIds }, type: "GOOD" },
    select: { userId: true, targetType: true, targetId: true },
  });
  const reactedSet = new Set(existingReactions.map((r) => `${r.userId}:${r.targetType}:${r.targetId}`));

  // ── 今日のいいね数（日次予算チェック） ──
  const todayLikeGroups = await prisma.reaction.groupBy({
    by: ["userId"],
    where: { userId: { in: personaUserIds }, type: "GOOD", createdAt: { gte: startOfJstDay } },
    _count: { id: true },
  });
  const todayLikeMap = new Map(todayLikeGroups.map((g) => [g.userId, g._count.id]));

  let totalLiked = 0;
  const results: string[] = [];

  // 候補投稿を毎回シャッフル（同じ順序で偏らない）
  const allCandidates = [
    ...candidateExpenses.map((e) => ({ id: e.id, targetType: "expense" as const, circleId: e.circleId, postUserId: e.userId, description: e.description, tags: e.tags })),
    ...candidateIncomes.map((i)  => ({ id: i.id, targetType: "income"  as const, circleId: i.circleId, postUserId: i.userId, description: i.description, tags: i.tags })),
  ].sort(() => Math.random() - 0.5);

  for (const persona of personas) {
    const userId = persona.user.id;
    const storedConfig = persona.personaConfig as PersonaConfig | null;
    const staticDef = PERSONA_MAP.get(persona.personaKey);
    const personalityTags: string[] = storedConfig?.personalityTags ?? staticDef?.personalityTags ?? [];

    const { dailyBudget, baseRate } = getPersonalityProfile(personalityTags);
    const usedToday = todayLikeMap.get(userId) ?? 0;
    const remaining = dailyBudget - usedToday;
    if (remaining <= 0) continue; // 今日の予算消化済み

    const interests = getInterestKeywords(persona.personaKey, personalityTags);
    const followBackUserIds = followBackMap.get(userId) ?? new Set<string>();

    const reactionsToCreate: { userId: string; targetType: string; targetId: string; type: "GOOD" }[] = [];

    for (const post of allCandidates) {
      if (reactionsToCreate.length >= Math.min(MAX_LIKES_PER_RUN, remaining)) break;
      if (post.postUserId === userId) continue;
      if (reactedSet.has(`${userId}:${post.targetType}:${post.id}`)) continue;

      let rate = baseRate;
      if (matchesInterests(post.description, post.tags, interests)) rate = Math.min(rate + 0.2, 0.85);
      if (followBackUserIds.has(post.postUserId)) rate = Math.min(rate + 0.3, 0.9);

      if (Math.random() < rate) {
        reactionsToCreate.push({ userId, targetType: post.targetType, targetId: post.id, type: "GOOD" });
        reactedSet.add(`${userId}:${post.targetType}:${post.id}`);
      }
    }

    if (reactionsToCreate.length > 0) {
      await prisma.reaction.createMany({ data: reactionsToCreate, skipDuplicates: true });
      totalLiked += reactionsToCreate.length;
      todayLikeMap.set(userId, usedToday + reactionsToCreate.length);
      results.push(`${persona.personaKey}(budget=${remaining}/${dailyBudget}): +${reactionsToCreate.length}`);
    }
  }

  if (totalLiked > 0) {
    console.log(JSON.stringify({ job: "persona-react", totalLiked, results }));
  }
  return NextResponse.json({ totalLiked, results });
}
