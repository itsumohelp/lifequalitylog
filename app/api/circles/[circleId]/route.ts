import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

type Params = {
  params: Promise<{ circleId: string }>;
};

// サークル名を更新
export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const { circleId } = await params;

  try {
    const body = await request.json();
    const { name } = body;

    // バリデーション: 名前が空でないことを確認
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "サークル名を入力してください" },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // 自分がこのサークルのADMINかチェック
    const membership = await prisma.circleMember.findUnique({
      where: {
        circleId_userId: {
          circleId,
          userId,
        },
      },
    });

    if (!membership || membership.role !== "ADMIN") {
      return NextResponse.json(
        { error: "このサークルの管理権限がありません" },
        { status: 403 }
      );
    }

    // 同じユーザーが同じ名前のサークルを既に持っているかチェック（自身を除く）
    const existingCircle = await prisma.circle.findFirst({
      where: {
        name: trimmedName,
        id: { not: circleId },
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

    // サークル名を更新
    const updatedCircle = await prisma.circle.update({
      where: { id: circleId },
      data: { name: trimmedName },
    });

    return NextResponse.json({ circle: updatedCircle });
  } catch (error) {
    console.error("Circle update error:", error);
    return NextResponse.json(
      { error: "サークル名の更新に失敗しました" },
      { status: 500 }
    );
  }
}

// サークルを削除
export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const { circleId } = await params;

  // 自分がこのサークルのADMINかチェック
  const membership = await prisma.circleMember.findUnique({
    where: {
      circleId_userId: {
        circleId,
        userId,
      },
    },
  });

  if (!membership || membership.role !== "ADMIN") {
    return NextResponse.json(
      { error: "このサークルの管理権限がありません" },
      { status: 403 }
    );
  }

  // メンバー数をチェック（ADMIN1人のみの場合のみ削除可能）
  const memberCount = await prisma.circleMember.count({
    where: { circleId },
  });

  if (memberCount > 1) {
    return NextResponse.json(
      { error: "他のメンバーがいるサークルは削除できません" },
      { status: 400 }
    );
  }

  // サークルを削除（onDelete: Cascadeで関連データも削除される）
  await prisma.circle.delete({
    where: { id: circleId },
  });

  return NextResponse.json({ success: true });
}
