import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseExpenseInput } from "@/lib/expenseParser";

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;

  try {
    const { circleId, text } = await request.json();

    if (!circleId || !text) {
      return NextResponse.json(
        { error: "サークルIDとテキストが必要です" },
        { status: 400 }
      );
    }

    // サークルへの参加確認
    const membership = await prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "このサークルに参加していません" },
        { status: 403 }
      );
    }

    // テキストをパース（expenseParserを流用）
    const parsed = parseExpenseInput(text);

    if (!parsed || parsed.amount <= 0) {
      return NextResponse.json(
        { error: "金額を読み取れませんでした" },
        { status: 400 }
      );
    }

    // 収入カテゴリを判定
    let category: "SALARY" | "BONUS" | "INVESTMENT" | "TRANSFER" | "OTHER" = "OTHER";
    const lowerText = text.toLowerCase();
    if (lowerText.includes("給与") || lowerText.includes("給料") || lowerText.includes("月給")) {
      category = "SALARY";
    } else if (lowerText.includes("ボーナス") || lowerText.includes("賞与")) {
      category = "BONUS";
    } else if (lowerText.includes("配当") || lowerText.includes("投資") || lowerText.includes("利息")) {
      category = "INVESTMENT";
    } else if (lowerText.includes("振込") || lowerText.includes("入金")) {
      category = "TRANSFER";
    }

    // 収入を保存
    const income = await prisma.income.create({
      data: {
        circleId,
        userId,
        amount: parsed.amount,
        description: text,
        source: parsed.place,
        category,
        tags: parsed.tags,
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json({ income }, { status: 201 });
  } catch (error) {
    console.error("Income creation error:", error);
    return NextResponse.json(
      { error: "収入の登録に失敗しました" },
      { status: 500 }
    );
  }
}
