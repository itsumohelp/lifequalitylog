/**
 * POST /api/cron/persona-post
 * 5分ごとに実行するペルソナ投稿ジョブ。
 * 各ペルソナの投稿判定後、Vertex AI で投稿内容（金額・説明・カテゴリ・タグ）を生成する。
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { GoogleGenAI } from "@google/genai";
import { getAiClient, GEMINI_MODEL } from "@/lib/vertexAi";
import { shouldPostNow, getPersonaDef } from "@/lib/personaEngine";
import type { PersonaConfig } from "@/data/personas";
import type { ExpenseCategoryKey } from "@/data/personas";

// ──────────────────────────────────────────
// AI による支出生成
// ──────────────────────────────────────────

type AiGeneratedPost = {
  amount: number;
  description: string;
  category: ExpenseCategoryKey;
  tags: string[];
};

async function generatePostViaAi(
  ai: GoogleGenAI,
  persona: PersonaConfig,
  jstHour: number,
): Promise<AiGeneratedPost | null> {
  const prompt = `あなたは以下のペルソナの日常的な支出を1件記録するAIです。

ペルソナ情報：
- 名前: ${persona.name}（${persona.age}歳・${persona.gender === "male" ? "男性" : "女性"}）
- 家族構成: ${persona.familyType}
- 性格・傾向: ${persona.personalityTags.join("、")}
- 生活スタイル: ${persona.description}
- 現在の時刻: ${jstHour}時台

この人物が今この時間帯に行いそうな支出を1件、自然な日本語で生成してください。
金額は実際の生活感に合った値にしてください。

以下のJSONフォーマットのみを返してください（コードブロック不要）：
{
  "amount": 金額（円・正の整数）,
  "description": "支出の説明（10〜25文字の自然な日本語）",
  "category": "FOOD" | "DAILY" | "TRANSPORT" | "ENTERTAINMENT" | "UTILITY" | "MEDICAL" | "OTHER" のいずれか,
  "tags": ["タグ1", "タグ2"]（0〜2個・自然なタグ名）
}`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const raw = JSON.parse(response.text?.trim() ?? "{}") as Record<string, unknown>;

    const amount = typeof raw.amount === "number" && raw.amount > 0 ? Math.round(raw.amount) : null;
    const description = typeof raw.description === "string" ? raw.description.slice(0, 50) : null;
    const validCategories: ExpenseCategoryKey[] = ["FOOD", "DAILY", "TRANSPORT", "ENTERTAINMENT", "UTILITY", "MEDICAL", "OTHER"];
    const category = validCategories.includes(raw.category as ExpenseCategoryKey)
      ? (raw.category as ExpenseCategoryKey)
      : "OTHER";
    const tags = Array.isArray(raw.tags)
      ? (raw.tags as unknown[]).filter((t) => typeof t === "string").slice(0, 2) as string[]
      : [];

    if (!amount || !description) return null;

    return { amount, description, category, tags };
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────
// PersonaDef → PersonaConfig 変換（静的ペルソナ用）
// ──────────────────────────────────────────

function defToConfig(def: NonNullable<ReturnType<typeof getPersonaDef>>): PersonaConfig {
  return {
    name: def.name,
    displayName: def.displayName,
    age: def.age,
    gender: def.gender,
    familyType: def.familyType,
    personalityTags: def.personalityTags,
    description: `${def.personalityTags.join("・")}の傾向がある${def.familyType}`,
    postFreqPerDay: def.postFreqPerDay,
    activeHours: def.activeHours,
  };
}

// ──────────────────────────────────────────
// メインハンドラー
// ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const jstHour = jstNow.getUTCHours();
  const jstDateStr = jstNow.toISOString().slice(0, 10).replace(/-/g, "");
  const yearMonth = `${jstNow.getUTCFullYear()}${String(jstNow.getUTCMonth() + 1).padStart(2, "0")}`;

  const profiles = await prisma.personaProfile.findMany({
    where: { activatedAt: { lte: new Date() } },
    include: { user: { select: { id: true } } },
  });

  const ai = await getAiClient();
  const posted: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  for (const profile of profiles) {
    // ペルソナ設定を解決（動的 > 静的）
    const storedConfig = profile.personaConfig as PersonaConfig | null;
    const staticDef = storedConfig ? null : getPersonaDef(profile.personaKey);
    const config: PersonaConfig | null = storedConfig ?? (staticDef ? defToConfig(staticDef) : null);

    if (!config) {
      skipped.push(profile.personaKey);
      continue;
    }

    if (!shouldPostNow(config, jstHour, jstDateStr, profile.personaKey)) {
      skipped.push(profile.personaKey);
      continue;
    }

    // Vertex AI で投稿内容を生成
    const postData = await generatePostViaAi(ai, config, jstHour);
    if (!postData) {
      failed.push(profile.personaKey);
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        const circle = await tx.circle.findUniqueOrThrow({
          where: { id: profile.circleId },
          select: { currentBalance: true },
        });

        const balanceBefore = circle.currentBalance;
        const balanceAfter = balanceBefore - postData.amount;

        await tx.expense.create({
          data: {
            circleId: profile.circleId,
            userId: profile.user.id,
            amount: postData.amount,
            description: postData.description,
            category: postData.category,
            tags: postData.tags,
            autoTags: [],
            expenseDate: new Date(),
          },
        });

        await tx.circle.update({
          where: { id: profile.circleId },
          data: { currentBalance: balanceAfter },
        });

        await tx.balanceTransaction.create({
          data: {
            circleId: profile.circleId,
            userId: profile.user.id,
            type: "EXPENSE",
            isDelete: false,
            amount: postData.amount,
            balanceBefore,
            balanceAfter,
          },
        });

        await tx.monthlySnapshot.upsert({
          where: { circleId_yearMonth: { circleId: profile.circleId, yearMonth } },
          update: {
            totalExpense: { increment: postData.amount },
            expenseCount: { increment: 1 },
          },
          create: {
            circleId: profile.circleId,
            yearMonth,
            totalExpense: postData.amount,
            expenseCount: 1,
          },
        });
      });

      posted.push(profile.personaKey);
    } catch (err) {
      console.error(`Failed to save expense for ${profile.personaKey}:`, err);
      failed.push(profile.personaKey);
    }
  }

  console.log(JSON.stringify({
    job: "persona-post",
    jstHour,
    activePersonas: profiles.length,
    posted: posted.length,
    skipped: skipped.length,
    failed: failed.length,
    hasPost: posted.length > 0,
  }));

  // 毎回いいねジョブを実行（日次予算でペルソナごとに自然な上限が決まる）
  try {
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    await fetch(`${baseUrl}/api/cron/persona-react`, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
  } catch {
    // いいねジョブの失敗は投稿ジョブに影響させない
  }

  return NextResponse.json({ posted, skipped, failed, jstHour });
}
