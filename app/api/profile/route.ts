import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { calcStreaks, evaluateTrophies, TROPHIES, type TrophyStats } from "@/lib/trophies";

export async function GET() {
  try {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id as string;

  // ── 1. 支出を全件取得（stats計算用）
  const expenses = await prisma.expense.findMany({
    where: { userId },
    select: { id: true, amount: true, category: true, tags: true, expenseDate: true },
    orderBy: { expenseDate: "asc" },
  });

  // ── 2. サークル参加数
  const circleCount = await prisma.circleMember.count({ where: { userId } });

  // ── 3. もらったリアクション数
  const expenseIds = expenses.map((e) => e.id);
  const reactionCount =
    expenseIds.length > 0
      ? await prisma.reaction.count({
          where: { targetType: "expense", targetId: { in: expenseIds } },
        })
      : 0;

  // ── 4. Stats計算
  const jstDateStrings = expenses.map((e) => {
    const jst = new Date(e.expenseDate.getTime() + 9 * 3600000);
    return jst.toISOString().slice(0, 10);
  });
  const { current: currentStreak, max: maxStreak } = calcStreaks(jstDateStrings);

  const categoryCounts: Partial<Record<string, number>> = {};
  let totalAmount = 0;
  let hasBigSpend = false;
  let hasSmallChange = false;
  let hasEarlyBird = false;
  let hasNightOwl = false;
  let hasLunchLogger = false;
  let hasDinnerLogger = false;
  let hasWeekend = false;
  let hasMonthStart = false;
  const uniqueTags = new Set<string>();

  for (const e of expenses) {
    const cat = e.category as string;
    categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
    totalAmount += e.amount;
    if (e.amount >= 10000) hasBigSpend = true;
    if (e.amount <= 100) hasSmallChange = true;
    for (const tag of e.tags) {
      if (tag.trim()) uniqueTags.add(tag.trim());
    }

    const jst = new Date(e.expenseDate.getTime() + 9 * 3600000);
    const h = jst.getUTCHours();
    const dow = jst.getUTCDay(); // 0=Sun, 6=Sat
    const dom = jst.getUTCDate();

    if (h < 6) hasEarlyBird = true;
    if (h === 0 || h === 1) hasNightOwl = true;
    if (h >= 12 && h < 14) hasLunchLogger = true;
    if (h >= 18 && h <= 21) hasDinnerLogger = true;
    if (dow === 0 || dow === 6) hasWeekend = true;
    if (dom === 1) hasMonthStart = true;
  }

  // 月間最大投稿数
  const monthlyCounts: Record<string, number> = {};
  for (const d of jstDateStrings) {
    const ym = d.slice(0, 7);
    monthlyCounts[ym] = (monthlyCounts[ym] ?? 0) + 1;
  }
  const monthlyMax = Object.values(monthlyCounts).reduce((a, b) => Math.max(a, b), 0);

  // 参加日数（最初の支出から）
  const firstDate = expenses[0]?.expenseDate;
  const daysSinceJoined = firstDate
    ? Math.floor((Date.now() - firstDate.getTime()) / 86400000)
    : 0;

  const stats: TrophyStats = {
    postCount: expenses.length,
    maxStreak,
    currentStreak,
    uniqueTagCount: uniqueTags.size,
    categoryCounts,
    reactionCount,
    circleCount,
    monthlyMax,
    totalAmount,
    hasBigSpend,
    hasSmallChange,
    hasEarlyBird,
    hasNightOwl,
    hasLunchLogger,
    hasDinnerLogger,
    hasWeekend,
    hasMonthStart,
  };

  // ── 5. トロフィー評価
  const shouldEarnKeys = new Set(evaluateTrophies(stats));

  // ── 6. 既獲得トロフィーを取得（Raw SQL: 生成クライアントのキャッシュに依存しない）
  type TrophyRow = { trophy_key: string; earned_at: Date };
  const alreadyEarned = await prisma.$queryRawUnsafe<TrophyRow[]>(
    `SELECT trophy_key, earned_at FROM user_trophies WHERE user_id = $1`,
    userId,
  );
  const alreadyEarnedKeys = new Set(alreadyEarned.map((t) => t.trophy_key));

  // ── 7. 新規獲得トロフィーを保存
  const newKeys = [...shouldEarnKeys].filter((k) => !alreadyEarnedKeys.has(k));
  for (const key of newKeys) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO user_trophies (id, user_id, trophy_key, earned_at)
       VALUES (gen_random_uuid(), $1, $2, NOW())
       ON CONFLICT (user_id, trophy_key) DO NOTHING`,
      userId,
      key,
    );
  }

  // ── 8. 全獲得トロフィー（DB最終状態）
  const allEarned = await prisma.$queryRawUnsafe<TrophyRow[]>(
    `SELECT trophy_key, earned_at FROM user_trophies WHERE user_id = $1`,
    userId,
  );
  const earnedMap = new Map(allEarned.map((t) => [t.trophy_key, t.earned_at]));

  const trophies = TROPHIES.map((def) => ({
    ...def,
    earned: earnedMap.has(def.key),
    earnedAt: earnedMap.get(def.key)?.toISOString() ?? null,
  }));

  return NextResponse.json({
    stats: {
      daysSinceJoined,
      postCount: expenses.length,
      uniqueTagCount: uniqueTags.size,
      reactionCount,
      currentStreak,
      totalAmount,
    },
    trophies,
    newlyEarned: newKeys,
  });
  } catch (err) {
    console.error("[profile] API error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: String(err) },
      { status: 500 },
    );
  }
}
