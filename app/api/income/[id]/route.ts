import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// 収入を削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // 収入を取得
  const income = await prisma.income.findUnique({
    where: { id },
  });

  if (!income) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ユーザーがサークルメンバーか確認（ADMIN または EDITOR）
  const member = await prisma.circleMember.findUnique({
    where: {
      circleId_userId: {
        circleId: income.circleId,
        userId: session.user.id,
      },
    },
  });

  if (!member || (member.role !== "ADMIN" && member.role !== "EDITOR")) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  // サークルのcurrentBalanceを更新（収入削除なので減らす）
  await prisma.circle.update({
    where: { id: income.circleId },
    data: { currentBalance: { decrement: income.amount } },
  });

  // 関連するリアクションを削除
  await prisma.reaction.deleteMany({
    where: {
      targetType: "income",
      targetId: id,
    },
  });

  // 収入を削除
  await prisma.income.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
