import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// 全サークルのcurrentBalanceを再計算して初期化する（管理者用）
export async function POST() {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 全サークルを取得
    const circles = await prisma.circle.findMany({
      select: { id: true },
    });

    const results: { circleId: string; balance: number }[] = [];

    for (const circle of circles) {
      // 最新のスナップショットを取得
      const latestSnapshot = await prisma.circleSnapshot.findFirst({
        where: { circleId: circle.id },
        orderBy: { createdAt: "desc" },
      });

      let balance = latestSnapshot?.amount || 0;
      const snapshotDate = latestSnapshot?.createdAt || new Date(0);

      // スナップショット以降の支出を取得して引く
      const expensesAfter = await prisma.expense.aggregate({
        where: {
          circleId: circle.id,
          createdAt: { gt: snapshotDate },
        },
        _sum: { amount: true },
      });
      balance -= expensesAfter._sum.amount || 0;

      // スナップショット以降の収入を取得して足す
      const incomesAfter = await prisma.income.aggregate({
        where: {
          circleId: circle.id,
          createdAt: { gt: snapshotDate },
        },
        _sum: { amount: true },
      });
      balance += incomesAfter._sum.amount || 0;

      // currentBalanceを更新
      const circleBefore = await prisma.circle.findUnique({
        where: { id: circle.id },
        select: { currentBalance: true },
      });
      const balanceBefore = circleBefore!.currentBalance;

      await prisma.circle.update({
        where: { id: circle.id },
        data: { currentBalance: balance },
      });

      await prisma.balanceTransaction.create({
        data: {
          circleId: circle.id,
          userId: session.user.id,
          type: "SNAPSHOT",
          isDelete: false,
          amount: balance,
          balanceBefore,
          balanceAfter: balance,
        },
      });

      results.push({ circleId: circle.id, balance });
    }

    return NextResponse.json({
      success: true,
      message: `${results.length}件のサークルの残高を初期化しました`,
      results,
    });
  } catch (error) {
    console.error("Balance initialization error:", error);
    return NextResponse.json(
      { error: "残高の初期化に失敗しました" },
      { status: 500 },
    );
  }
}
