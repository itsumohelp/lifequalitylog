import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { parseExpenseInput } from "@/lib/expenseParser";

// 支出一覧を取得
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const circleId = searchParams.get("circleId");

  if (!circleId) {
    return NextResponse.json(
      { error: "circleId is required" },
      { status: 400 },
    );
  }

  // ユーザーがサークルメンバーか確認
  const member = await prisma.circleMember.findUnique({
    where: {
      circleId_userId: {
        circleId,
        userId: session.user.id,
      },
    },
  });

  if (!member) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const expenses = await prisma.expense.findMany({
    where: { circleId },
    orderBy: { expenseDate: "desc" },
    take: 50,
    include: {
      user: {
        select: { name: true, image: true },
      },
    },
  });

  return NextResponse.json({ expenses });
}

// 支出を登録
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { circleId, text } = body;

  if (!circleId || !text) {
    return NextResponse.json(
      { error: "circleId and text are required" },
      { status: 400 },
    );
  }

  // ユーザーがサークルメンバーか確認（EDITOR以上）
  const member = await prisma.circleMember.findUnique({
    where: {
      circleId_userId: {
        circleId,
        userId: session.user.id,
      },
    },
  });

  if (!member || member.role === "VIEWER") {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  // 入力をパース
  const parsed = parseExpenseInput(text);
  if (!parsed) {
    return NextResponse.json(
      { error: "入力を解析できませんでした。例: 「コンビニで500円」" },
      { status: 400 },
    );
  }

  // 支出を登録
  const expense = await prisma.expense.create({
    data: {
      circleId,
      userId: session.user.id,
      amount: parsed.amount,
      description: text,
      place: parsed.place,
      category: parsed.category,
      tags: parsed.tags,
    },
    include: {
      user: {
        select: { name: true, image: true },
      },
    },
  });

  // サークルのcurrentBalanceを更新（支出なので減らす）
  const circleBeforeExpense = await prisma.circle.findUnique({
    where: { id: circleId },
    select: { currentBalance: true },
  });
  const balanceBefore = circleBeforeExpense!.currentBalance;
  const balanceAfter = balanceBefore - parsed.amount;

  await prisma.circle.update({
    where: { id: circleId },
    data: { currentBalance: { decrement: parsed.amount } },
  });

  await prisma.balanceTransaction.create({
    data: {
      circleId,
      userId: session.user.id,
      type: "EXPENSE",
      isDelete: false,
      amount: parsed.amount,
      balanceBefore,
      balanceAfter,
    },
  });

  // 月次集計を更新（YYYYMM形式）
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

  await prisma.monthlySnapshot.upsert({
    where: {
      circleId_yearMonth: {
        circleId,
        yearMonth,
      },
    },
    create: {
      circleId,
      yearMonth,
      totalExpense: parsed.amount,
      expenseCount: 1,
    },
    update: {
      totalExpense: { increment: parsed.amount },
      expenseCount: { increment: 1 },
    },
  });

  return NextResponse.json({ expense, parsed });
}
