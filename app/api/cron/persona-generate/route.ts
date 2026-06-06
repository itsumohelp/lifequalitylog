/**
 * POST /api/cron/persona-generate
 * 1時間ごとに実行するペルソナ自動生成ジョブ。
 * Vertex AI でランダムな日本人ペルソナを生成し DB に格納する。
 * 確率: 0人(50%) / 1人(35%) / 2人(15%)
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAiClient, GEMINI_MODEL } from "@/lib/vertexAi";
import { PersonaConfig } from "@/data/personas";

function pickCount(): number {
  const r = Math.random();
  if (r < 0.50) return 0;
  if (r < 0.85) return 1;
  return 2;
}

function validatePersonaConfig(raw: unknown): PersonaConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;

  const name = typeof c.name === "string" ? c.name.slice(0, 20) : null;
  const displayName = typeof c.displayName === "string" ? c.displayName.slice(0, 10) : null;
  const age = typeof c.age === "number" && c.age >= 10 && c.age <= 90 ? Math.round(c.age) : null;
  const gender = c.gender === "male" || c.gender === "female" ? c.gender : null;
  const familyType = typeof c.familyType === "string" ? c.familyType.slice(0, 50) : null;
  const description = typeof c.description === "string" ? c.description.slice(0, 100) : null;
  const personalityTags =
    Array.isArray(c.personalityTags)
      ? (c.personalityTags as unknown[]).filter((t) => typeof t === "string").slice(0, 5) as string[]
      : null;
  const postFreqPerDay =
    typeof c.postFreqPerDay === "number"
      ? Math.min(10, Math.max(0.1, c.postFreqPerDay))
      : null;
  const activeHours =
    Array.isArray(c.activeHours)
      ? (c.activeHours as unknown[])
          .filter((h) => typeof h === "number" && h >= 0 && h <= 23)
          .map((h) => Math.round(h as number))
          .slice(0, 12) as number[]
      : null;

  if (!name || !displayName || age === null || !gender || !familyType || !description || !personalityTags || postFreqPerDay === null || !activeHours?.length) {
    return null;
  }

  return { name, displayName, age, gender, familyType, description, personalityTags, postFreqPerDay, activeHours };
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = pickCount();
  if (count === 0) {
    console.log(JSON.stringify({ job: "persona-generate", planned: 0, created: 0, hasNew: false }));
    return NextResponse.json({ created: [], skipped: true });
  }

  // 重複回避のために既存ペルソナ名を取得
  const existing = await prisma.personaProfile.findMany({
    include: { user: { select: { name: true } } },
  });
  const existingNames = existing
    .map((p) => p.user.name)
    .filter(Boolean)
    .join("、");

  const ai = await getAiClient();
  const created: string[] = [];

  for (let i = 0; i < count; i++) {
    try {
      const prompt = `あなたは日本人の家計管理アプリのデモユーザーを生成するAIです。
以下の条件でランダムな日本人ペルソナを1人作成してください。

条件：
- 既存ペルソナ（${existingNames || "なし"}）と重複しない名前にすること
- 年齢は10代〜70代でランダムに分布させること
- 性格・生活スタイルが個性的であること（節約家、散財、趣味多い、健康志向など）
- activeHoursはその人の生活リズムに合った時間帯（0〜23の整数の配列）にすること
- postFreqPerDayは0.2（週数回）〜5.0（1日複数回）の範囲で性格に応じて設定すること

以下のJSONフォーマットのみを返してください（コードブロック不要）：
{
  "name": "氏名（漢字フルネーム）",
  "displayName": "呼び名（2〜4文字）",
  "age": 年齢（数値）,
  "gender": "male" または "female",
  "familyType": "家族構成の説明（例: 独身・一人暮らし）",
  "personalityTags": ["性格タグ1", "性格タグ2", "性格タグ3"],
  "description": "日常生活と支出傾向の説明（40〜80文字）",
  "postFreqPerDay": 投稿頻度（0.2〜5.0の小数）,
  "activeHours": [活動時間帯の整数配列（例: [8,12,19,22]）]
}`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const raw = JSON.parse(response.text?.trim() ?? "{}");
      const config = validatePersonaConfig(raw);
      if (!config) {
        console.error("Invalid persona config from AI:", raw);
        continue;
      }

      const personaKey = `ai_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`;
      const circleName = `${config.displayName}の家計`;

      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: config.name,
            displayName: config.displayName,
            email: `${personaKey}@circlerun.app`,
            isAiPersona: true,
          },
        });

        const circle = await tx.circle.create({
          data: { name: circleName, isPublic: true },
        });

        await tx.circleMember.create({
          data: { circleId: circle.id, userId: user.id, role: "ADMIN" },
        });

        await tx.personaProfile.create({
          data: {
            userId: user.id,
            personaKey,
            circleId: circle.id,
            activatedAt: new Date(),
            personaConfig: config as object,
          },
        });
      });

      created.push(config.name);
    } catch (err) {
      console.error("Failed to generate or save persona:", err);
    }
  }

  console.log(JSON.stringify({
    job: "persona-generate",
    planned: count,
    created: created.length,
    createdNames: created,
    hasNew: created.length > 0,
  }));

  return NextResponse.json({ created, count: created.length });
}
