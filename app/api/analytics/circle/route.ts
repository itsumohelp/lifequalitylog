import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const circleId = searchParams.get("circleId");

  const memberships = await prisma.circleMember.findMany({
    where: { userId },
    select: { circleId: true, role: true },
  });

  if (memberships.length === 0) {
    return NextResponse.json({ circles: [] });
  }

  const circleIds = memberships.map((m) => m.circleId);
  const roleMap = new Map(memberships.map((m) => [m.circleId, m.role]));

  const circles = await prisma.circle.findMany({
    where: { id: { in: circleIds } },
    select: { id: true, name: true, currentBalance: true },
  });

  // サークルごとの投稿数（支出+収入）を取得
  const [expenseCounts, incomeCounts] = await Promise.all([
    prisma.expense.groupBy({
      by: ["circleId"],
      where: { circleId: { in: circleIds } },
      _count: { id: true },
    }),
    prisma.income.groupBy({
      by: ["circleId"],
      where: { circleId: { in: circleIds } },
      _count: { id: true },
    }),
  ]);

  const expCountMap = new Map(expenseCounts.map((r) => [r.circleId, r._count.id]));
  const incCountMap = new Map(incomeCounts.map((r) => [r.circleId, r._count.id]));

  const circleList = circles
    .map((c) => ({
      id: c.id,
      name: c.name ?? "",
      role: roleMap.get(c.id) ?? "EDITOR",
      currentBalance: c.currentBalance,
      postCount: (expCountMap.get(c.id) ?? 0) + (incCountMap.get(c.id) ?? 0),
    }))
    // 管理者を前、その中で投稿数降順、次に編集者で投稿数降順
    .sort((a, b) => {
      if (a.role === "ADMIN" && b.role !== "ADMIN") return -1;
      if (a.role !== "ADMIN" && b.role === "ADMIN") return 1;
      return b.postCount - a.postCount;
    });

  if (!circleId || !circleIds.includes(circleId)) {
    return NextResponse.json({ circles: circleList });
  }

  const selectedCircle = circles.find((c) => c.id === circleId);
  const balance = selectedCircle?.currentBalance ?? 0;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const [monthlyExpenses, monthlyIncomeAgg, dailyExpenses, dailyIncomes, dailySnapshots] = await Promise.all([
    // 当月の支出（タグ付きで全件返す → クライアントでフィルタ）
    prisma.expense.findMany({
      where: { circleId, expenseDate: { gte: startOfMonth } },
      select: { amount: true, tags: true },
    }),
    // 当月の収入合計
    prisma.income.aggregate({
      where: { circleId, incomeDate: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    // 過去30日の支出（タグ付き）
    prisma.expense.findMany({
      where: { circleId, expenseDate: { gte: thirtyDaysAgo, lte: endOfToday } },
      select: { amount: true, tags: true, expenseDate: true },
      orderBy: { expenseDate: "asc" },
    }),
    // 過去30日の収入
    prisma.income.findMany({
      where: { circleId, incomeDate: { gte: thirtyDaysAgo, lte: endOfToday } },
      select: { amount: true, incomeDate: true },
      orderBy: { incomeDate: "asc" },
    }),
    // 過去30日の残高スナップショット
    prisma.circleSnapshot.findMany({
      where: { circleId, snapshotDate: { gte: thirtyDaysAgo, lte: endOfToday } },
      select: { amount: true, snapshotDate: true },
      orderBy: { snapshotDate: "asc" },
    }),
  ]);

  // 全タグ一覧（当月のみ対象）
  const allTags = [...new Set(monthlyExpenses.flatMap((e) => e.tags))].sort();

  // 日付キー生成（YYYY-MM-DD）
  const toDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return NextResponse.json({
    circles: circleList,
    balance,
    tags: allTags,
    monthlyExpenses: monthlyExpenses.map((e) => ({ amount: e.amount, tags: e.tags })),
    monthlyIncomeTotal: monthlyIncomeAgg._sum.amount ?? 0,
    dailyExpenses: dailyExpenses.map((e) => ({
      date: toDateKey(new Date(e.expenseDate)),
      amount: e.amount,
      tags: e.tags,
    })),
    dailyIncomes: dailyIncomes.map((i) => ({
      date: toDateKey(new Date(i.incomeDate)),
      amount: i.amount,
    })),
    dailySnapshots: dailySnapshots.map((s) => ({
      date: toDateKey(new Date(s.snapshotDate)),
      amount: s.amount,
    })),
  });
}
