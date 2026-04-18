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

  if (!circleId) {
    return NextResponse.json({ error: "circleId is required" }, { status: 400 });
  }

  // メンバーか確認
  const membership = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId, userId } },
    select: { role: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const circle = await prisma.circle.findUnique({
    where: { id: circleId },
    select: { currentBalance: true },
  });

  // 過去12ヶ月分
  const now = new Date();
  const months: { year: number; month: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  const startDate = new Date(months[0].year, months[0].month - 1, 1);

  const [expenses, incomes] = await Promise.all([
    prisma.expense.findMany({
      where: { circleId, expenseDate: { gte: startDate } },
      select: { amount: true, expenseDate: true },
    }),
    prisma.income.findMany({
      where: { circleId, incomeDate: { gte: startDate } },
      select: { amount: true, incomeDate: true },
    }),
  ]);

  // 月ごとに集計
  const expMap = new Map<string, number>();
  for (const e of expenses) {
    const d = new Date(e.expenseDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    expMap.set(key, (expMap.get(key) ?? 0) + e.amount);
  }
  const incMap = new Map<string, number>();
  for (const i of incomes) {
    const d = new Date(i.incomeDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    incMap.set(key, (incMap.get(key) ?? 0) + i.amount);
  }

  const monthly = months.map(({ year, month }) => {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const expense = expMap.get(key) ?? 0;
    const income = incMap.get(key) ?? 0;
    return { yearMonth: key, label: `${year}/${String(month).padStart(2, "0")}`, expense, income, net: income - expense };
  });

  return NextResponse.json({
    monthly,
    currentBalance: circle?.currentBalance ?? 0,
  });
}
