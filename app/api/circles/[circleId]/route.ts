import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

type Params = {
  params: Promise<{ circleId: string }>;
};

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
