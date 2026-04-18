import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await req.json();
  const { circleId } = body as { circleId: string };

  if (!circleId) {
    return NextResponse.json({ error: "circleId is required" }, { status: 400 });
  }

  // サークルメンバーか確認
  const membership = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId, userId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // JSTで今日の日付を取得
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const todayStr = jstNow.toISOString().slice(0, 10);

  // 今日のインサイトが既に存在するか確認（サークル単位）
  const existingInsight = await prisma.userInsight.findFirst({
    where: {
      userId,
      circleId,
      generatedAt: {
        gte: new Date(`${todayStr}T00:00:00+09:00`),
        lt: new Date(`${todayStr}T24:00:00+09:00`),
      },
    },
    orderBy: { generatedAt: "desc" },
  });

  if (existingInsight) {
    return NextResponse.json({
      id: existingInsight.id,
      insight: existingInsight.insight,
      generatedAt: existingInsight.generatedAt.toISOString(),
      cached: true,
    });
  }

  // 期間を2分割して取得
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const fetchPeriod = (gte: Date, lt: Date) =>
    Promise.all([
      prisma.expense.findMany({
        where: { circleId, createdAt: { gte, lt } },
        orderBy: { createdAt: "desc" },
        select: { amount: true, description: true, category: true, tags: true },
      }),
      prisma.income.findMany({
        where: { circleId, createdAt: { gte, lt } },
        orderBy: { createdAt: "desc" },
        select: { amount: true, description: true, category: true },
      }),
      prisma.circleSnapshot.findMany({
        where: { circleId, createdAt: { gte, lt } },
        orderBy: { createdAt: "desc" },
        select: { amount: true, note: true, diffFromPrev: true },
      }),
    ]);

  const [[prevExpenses, prevIncomes, prevSnapshots], [recentExpenses, recentIncomes, recentSnapshots]] =
    await Promise.all([
      fetchPeriod(twoWeeksAgo, oneWeekAgo),
      fetchPeriod(oneWeekAgo, now),
    ]);

  const hasAnyData =
    prevExpenses.length + prevIncomes.length + prevSnapshots.length +
    recentExpenses.length + recentIncomes.length + recentSnapshots.length > 0;

  if (!hasAnyData) {
    return NextResponse.json(
      { error: "直近2週間のデータがありません" },
      { status: 400 }
    );
  }

  // Google Gen AI SDK (Vertex AI バックエンド)
  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT!,
    location: "asia-northeast1",
  });

  const summarizePeriod = (
    expenses: typeof prevExpenses,
    incomes: typeof prevIncomes,
    snapshots: typeof prevSnapshots
  ) => {
    const lines: string[] = [];
    if (expenses.length > 0) {
      const total = expenses.reduce((s, e) => s + e.amount, 0);
      const detail = expenses.slice(0, 10).map((e) => `${e.description}(${e.amount}円)`).join("、");
      lines.push(`支出: ${total.toLocaleString()}円/${expenses.length}件 [${detail}]`);
    }
    if (incomes.length > 0) {
      const total = incomes.reduce((s, i) => s + i.amount, 0);
      lines.push(`収入: ${total.toLocaleString()}円/${incomes.length}件`);
    }
    if (snapshots.length > 0) {
      const latest = snapshots[0];
      lines.push(`残高: ${latest.amount.toLocaleString()}円${latest.diffFromPrev != null ? `(前週比${latest.diffFromPrev >= 0 ? "+" : ""}${latest.diffFromPrev.toLocaleString()}円)` : ""}`);
    }
    return lines.length > 0 ? lines.join("\n") : "記録なし";
  };

  const prevSummary = summarizePeriod(prevExpenses, prevIncomes, prevSnapshots);
  const recentSummary = summarizePeriod(recentExpenses, recentIncomes, recentSnapshots);

  const prompt = `あなたは家計アドバイザーです。以下はサークルメンバーが記録した家計データです。
前の週と直近1週間を比較して、変化や傾向に触れた一言コメントをしてください。日本語50文字以内で返してください。

視点・ルール：
- 家計の記録を外から見ているアドバイザーとしてコメントすること
- 2週間の変化・傾向（増減・継続など）に必ず触れること
- 記録してくれたことへの感謝や労いを自然に添えること
- 前向きで温かいトーンにすること。批判・警告はしないこと
- 必ず文章を完結させ、途中で切れないこと
- 句読点含め150文字以内で返すこと。複数文でも可

【前の週（2週間前〜1週間前）】
${prevSummary}

【直近1週間】
${recentSummary}

メッセージ:`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const text = response.text?.trim() ?? "";
  const insight = text.slice(0, 150);

  if (!insight) {
    return NextResponse.json(
      { error: "インサイトを生成できませんでした" },
      { status: 500 }
    );
  }

  // DBに保存
  const saved = await prisma.userInsight.create({
    data: { userId, circleId, insight },
  });

  return NextResponse.json({
    id: saved.id,
    insight: saved.insight,
    generatedAt: saved.generatedAt.toISOString(),
    cached: false,
  });
}
