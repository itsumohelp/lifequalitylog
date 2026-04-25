import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// 収入を更新（タグ編集）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { tags, autoTags, incomeDate } = body;

  const income = await prisma.income.findUnique({ where: { id } });
  if (!income) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const member = await prisma.circleMember.findUnique({
    where: {
      circleId_userId: { circleId: income.circleId, userId: session.user.id },
    },
  });
  if (!member || (member.role !== "ADMIN" && member.role !== "EDITOR")) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }
  if (member.role === "EDITOR" && income.userId !== session.user.id) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const updated = await prisma.income.update({
    where: { id },
    data: {
      ...(tags !== undefined && { tags }),
      ...(autoTags !== undefined && { autoTags }),
      ...(incomeDate !== undefined && { incomeDate: new Date(incomeDate) }),
    },
  });

  return NextResponse.json({ income: updated });
}

// 収入を削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

  // EDITORは自分の投稿のみ削除可
  if (member.role === "EDITOR" && income.userId !== session.user.id) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  // サークルのcurrentBalanceを更新（収入削除なので減らす）
  const circleBeforeDelete = await prisma.circle.findUnique({
    where: { id: income.circleId },
    select: { currentBalance: true },
  });
  const balanceBefore = circleBeforeDelete!.currentBalance;
  const balanceAfter = balanceBefore - income.amount;

  await prisma.circle.update({
    where: { id: income.circleId },
    data: { currentBalance: { decrement: income.amount } },
  });

  await prisma.balanceTransaction.create({
    data: {
      circleId: income.circleId,
      userId: session.user.id,
      type: "INCOME",
      isDelete: true,
      amount: income.amount,
      balanceBefore,
      balanceAfter,
    },
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
