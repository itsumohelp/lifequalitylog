import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month - 1, now.getDate(), 23, 59, 59, 999);

  const memberships = await prisma.circleMember.findMany({
    where: { userId },
    select: { circleId: true },
  });

  if (memberships.length === 0) {
    return NextResponse.json({ month: `${year}年${month}月`, circles: [] });
  }

  const circleIds = memberships.map((m) => m.circleId);

  const [circles, expenseAggs, incomeAggs, snapshots] = await Promise.all([
    prisma.circle.findMany({
      where: { id: { in: circleIds } },
      select: { id: true, name: true, currentBalance: true },
    }),
    prisma.expense.groupBy({
      by: ["circleId"],
      where: {
        circleId: { in: circleIds },
        expenseDate: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amount: true },
    }),
    prisma.income.groupBy({
      by: ["circleId"],
      where: {
        circleId: { in: circleIds },
        incomeDate: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amount: true },
    }),
    prisma.circleSnapshot.findMany({
      where: {
        circleId: { in: circleIds },
        snapshotDate: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { circleId: true, amount: true, snapshotDate: true },
      orderBy: { snapshotDate: "asc" },
    }),
  ]);

  const expMap = new Map(expenseAggs.map((e) => [e.circleId, e._sum.amount ?? 0]));
  const incMap = new Map(incomeAggs.map((i) => [i.circleId, i._sum.amount ?? 0]));

  const toDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const circleData = circles.map((c) => ({
    id: c.id,
    name: c.name ?? "",
    totalExpense: expMap.get(c.id) ?? 0,
    totalIncome: incMap.get(c.id) ?? 0,
    balance: c.currentBalance,
    dailySnapshots: snapshots
      .filter((s) => s.circleId === c.id)
      .map((s) => ({ date: toDateKey(new Date(s.snapshotDate)), amount: s.amount })),
  }));

  return NextResponse.json({
    month: `${year}年${month}月`,
    circles: circleData,
  });
}
