import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// 残高スナップショットを削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // スナップショットを取得
  const snapshot = await prisma.circleSnapshot.findUnique({
    where: { id },
  });

  if (!snapshot) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ユーザーがサークルメンバーか確認（ADMIN または EDITOR）
  const member = await prisma.circleMember.findUnique({
    where: {
      circleId_userId: {
        circleId: snapshot.circleId,
        userId: session.user.id,
      },
    },
  });

  if (!member || (member.role !== "ADMIN" && member.role !== "EDITOR")) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  // 関連するリアクションを削除
  await prisma.reaction.deleteMany({
    where: {
      targetType: "snapshot",
      targetId: id,
    },
  });

  // スナップショットを削除
  await prisma.circleSnapshot.delete({
    where: { id },
  });

  // currentBalanceを再計算
  // 削除後の最新スナップショットを取得
  const latestSnapshot = await prisma.circleSnapshot.findFirst({
    where: { circleId: snapshot.circleId },
    orderBy: { createdAt: "desc" },
  });

  let newBalance = latestSnapshot?.amount || 0;
  const snapshotDate = latestSnapshot?.createdAt || new Date(0);

  // スナップショット以降の支出を引く
  const expensesAfter = await prisma.expense.aggregate({
    where: {
      circleId: snapshot.circleId,
      createdAt: { gt: snapshotDate },
    },
    _sum: { amount: true },
  });
  newBalance -= expensesAfter._sum.amount || 0;

  // スナップショット以降の収入を足す
  const incomesAfter = await prisma.income.aggregate({
    where: {
      circleId: snapshot.circleId,
      createdAt: { gt: snapshotDate },
    },
    _sum: { amount: true },
  });
  newBalance += incomesAfter._sum.amount || 0;

  // currentBalanceを更新
  const circleBeforeDelete = await prisma.circle.findUnique({
    where: { id: snapshot.circleId },
    select: { currentBalance: true },
  });
  const balanceBefore = circleBeforeDelete!.currentBalance;

  await prisma.circle.update({
    where: { id: snapshot.circleId },
    data: { currentBalance: newBalance },
  });

  await prisma.balanceTransaction.create({
    data: {
      circleId: snapshot.circleId,
      userId: session.user.id,
      type: "SNAPSHOT",
      isDelete: true,
      amount: snapshot.amount,
      balanceBefore,
      balanceAfter: newBalance,
    },
  });

  return NextResponse.json({ success: true });
}
