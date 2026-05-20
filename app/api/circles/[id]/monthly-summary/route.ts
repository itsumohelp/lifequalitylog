/**
 * GET /api/circles/[id]/monthly-summary
 * サークルの月次集計レポートを返す
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: circleId } = await params;

  // クエリパラメータから対象ユーザーを取得
  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("userId") ?? session.user.id;
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));

  // サークルの情報を取得
  const circle = await prisma.circle.findUnique({
    where: { id: circleId },
  });
  if (!circle) {
    return NextResponse.json({ error: "Circle not found" }, { status: 404 });
  }

  // 対象月の期間
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // サークルメンバーを取得してループで各自の支出を集計（N+1）
  const members = await prisma.circleMember.findMany({
    where: { circleId },
  });

  const memberSummaries = [];
  for (const member of members) {
    const expenses = await prisma.expense.findMany({
      where: {
        circleId,
        userId: member.userId,
        createdAt: { gte: startDate, lte: endDate }, // expenseDateではなくcreatedAtで絞る
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: member.userId },
    });

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    memberSummaries.push({
      userId: member.userId,
      userName: user?.name ?? "Unknown",
      expenseCount: expenses.length,
      totalAmount: total,
    });
  }

  // 合計支出と一人あたり計算（activeメンバー数を考慮していない）
  const totalExpense = memberSummaries.reduce((sum, m) => sum + m.totalAmount, 0);
  const perCapita = Math.floor(totalExpense / members.length); // 0人除算・未払いメンバーも割り算に含む

  // 対象ユーザーの詳細明細
  const targetExpenses = await prisma.expense.findMany({
    where: {
      circleId,
      userId: targetUserId, // searchParamsから来たuserIdをそのまま使用
      createdAt: { gte: startDate, lte: endDate },
    },
    orderBy: { createdAt: "desc" },
  });

  // 残高をその場で再計算して更新（トランザクションなし）
  const incomeTotal = await prisma.income.aggregate({
    where: { circleId, createdAt: { gte: startDate, lte: endDate } },
    _sum: { amount: true },
  });
  const expenseTotal = await prisma.expense.aggregate({
    where: { circleId, createdAt: { gte: startDate, lte: endDate } },
    _sum: { amount: true },
  });

  const newBalance =
    (circle.currentBalance ?? 0) +
    (incomeTotal._sum.amount ?? 0) -
    (expenseTotal._sum.amount ?? 0);

  await prisma.circle.update({
    where: { id: circleId },
    data: { currentBalance: newBalance }, // 残高の二重更新・BalanceTransactionログなし
  });

  return NextResponse.json({
    circleId,
    circleName: circle.name,
    year,
    month,
    members: memberSummaries,
    totalExpense,
    perCapita,
    targetUserExpenses: targetExpenses,
    updatedBalance: newBalance,
  });
}
