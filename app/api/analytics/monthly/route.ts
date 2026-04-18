import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const memberships = await prisma.circleMember.findMany({
      where: { userId },
      select: { circleId: true, role: true },
    });

    if (memberships.length === 0) {
      return NextResponse.json({ summary: [], currentYearMonth: "", prevYearMonth: "" });
    }

    const circleIds = memberships.map((m) => m.circleId);
    const roleMap = new Map(memberships.map((m) => [m.circleId, m.role]));

    const circles = await prisma.circle.findMany({
      where: { id: { in: circleIds } },
      select: { id: true, name: true, currentBalance: true },
    });

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    const startOfPrevMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfPrevMonth = startOfCurrentMonth;

    const [currentExpenses, currentIncomes, prevExpenses, prevIncomes] = await Promise.all([
      prisma.expense.groupBy({
        by: ["circleId"],
        where: { circleId: { in: circleIds }, expenseDate: { gte: startOfCurrentMonth } },
        _sum: { amount: true },
      }),
      prisma.income.groupBy({
        by: ["circleId"],
        where: { circleId: { in: circleIds }, incomeDate: { gte: startOfCurrentMonth } },
        _sum: { amount: true },
      }),
      prisma.expense.groupBy({
        by: ["circleId"],
        where: { circleId: { in: circleIds }, expenseDate: { gte: startOfPrevMonth, lt: endOfPrevMonth } },
        _sum: { amount: true },
      }),
      prisma.income.groupBy({
        by: ["circleId"],
        where: { circleId: { in: circleIds }, incomeDate: { gte: startOfPrevMonth, lt: endOfPrevMonth } },
        _sum: { amount: true },
      }),
    ]);

    const toMap = (rows: { circleId: string; _sum: { amount: number | null } }[]) =>
      new Map(rows.map((r) => [r.circleId, r._sum.amount ?? 0]));

    const curExpMap = toMap(currentExpenses);
    const curIncMap = toMap(currentIncomes);
    const prevExpMap = toMap(prevExpenses);
    const prevIncMap = toMap(prevIncomes);

    const summary = circles.map((c) => {
      const curExp = curExpMap.get(c.id) ?? 0;
      const curInc = curIncMap.get(c.id) ?? 0;
      const prvExp = prevExpMap.get(c.id) ?? 0;
      const prvInc = prevIncMap.get(c.id) ?? 0;
      return {
        circleId: c.id,
        circleName: c.name ?? "",
        role: roleMap.get(c.id) ?? "EDITOR",
        currentBalance: c.currentBalance,
        current: { expense: curExp, income: curInc, net: curInc - curExp },
        prev: { expense: prvExp, income: prvInc, net: prvInc - prvExp },
        diff: { expense: curExp - prvExp, income: curInc - prvInc, net: (curInc - curExp) - (prvInc - prvExp) },
      };
    });

    const currentYearMonth = `${currentYear}/${String(currentMonth + 1).padStart(2, "0")}`;
    const prevYearMonth = `${currentMonth === 0 ? currentYear - 1 : currentYear}/${String(currentMonth === 0 ? 12 : currentMonth).padStart(2, "0")}`;

    return NextResponse.json({ summary, currentYearMonth, prevYearMonth });
  } catch (error) {
    console.error("Monthly summary error:", error);
    return NextResponse.json({ error: "集計の取得に失敗しました" }, { status: 500 });
  }
}
