import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;

  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "サークル名を入力してください" },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // ユーザーがADMINとして保持しているサークル数をチェック（上限5個）
    const adminCircleCount = await prisma.circleMember.count({
      where: {
        userId,
        role: "ADMIN",
      },
    });

    if (adminCircleCount >= 5) {
      return NextResponse.json(
        { error: "サークルは5個まで作成できます" },
        { status: 400 }
      );
    }

    // 同じユーザーが同じ名前のサークルを既に持っているかチェック
    const existingCircle = await prisma.circle.findFirst({
      where: {
        name: trimmedName,
        members: {
          some: {
            userId,
            role: "ADMIN",
          },
        },
      },
    });

    if (existingCircle) {
      return NextResponse.json(
        { error: "同じ名前のサークルが既に存在します" },
        { status: 400 }
      );
    }

    // Circle を作成しつつ、作成者を ADMIN として参加させる
    const circle = await prisma.circle.create({
      data: {
        name: trimmedName,
        currency: "JPY",
        members: {
          create: {
            userId,
            role: "ADMIN",
          },
        },
      },
    });

    return NextResponse.json({ circle }, { status: 201 });
  } catch (error) {
    console.error("Circle creation error:", error);
    return NextResponse.json(
      { error: "サークルの作成に失敗しました" },
      { status: 500 }
    );
  }
}
