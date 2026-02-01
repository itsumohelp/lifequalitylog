import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// 支出を削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // 支出を取得
  const expense = await prisma.expense.findUnique({
    where: { id },
  });

  if (!expense) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ユーザーがサークルメンバーか確認（ADMIN または EDITOR）
  const member = await prisma.circleMember.findUnique({
    where: {
      circleId_userId: {
        circleId: expense.circleId,
        userId: session.user.id,
      },
    },
  });

  if (!member || (member.role !== "ADMIN" && member.role !== "EDITOR")) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  // サークルのcurrentBalanceを更新（支出削除なので戻す）
  await prisma.circle.update({
    where: { id: expense.circleId },
    data: { currentBalance: { increment: expense.amount } },
  });

  // 月次集計を更新
  const expenseDate = new Date(expense.createdAt);
  const yearMonth = `${expenseDate.getFullYear()}${String(expenseDate.getMonth() + 1).padStart(2, "0")}`;

  await prisma.monthlySnapshot.updateMany({
    where: {
      circleId: expense.circleId,
      yearMonth,
    },
    data: {
      totalExpense: { decrement: expense.amount },
      expenseCount: { decrement: 1 },
    },
  });

  // 関連するリアクションを削除
  await prisma.reaction.deleteMany({
    where: {
      targetType: "expense",
      targetId: id,
    },
  });

  // 支出を削除
  await prisma.expense.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
