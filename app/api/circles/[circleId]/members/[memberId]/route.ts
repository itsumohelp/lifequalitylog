import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

type Params = {
  params: Promise<{ circleId: string; memberId: string }>;
};

// メンバーをサークルから削除
export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const { circleId, memberId } = await params;

  // 自分がこのサークルのADMINかチェック
  const adminMembership = await prisma.circleMember.findUnique({
    where: {
      circleId_userId: {
        circleId,
        userId,
      },
    },
  });

  if (!adminMembership || adminMembership.role !== "ADMIN") {
    return NextResponse.json(
      { error: "このサークルの管理権限がありません" },
      { status: 403 }
    );
  }

  // 自分自身は削除できない
  if (memberId === userId) {
    return NextResponse.json(
      { error: "自分自身は削除できません" },
      { status: 400 }
    );
  }

  // 対象メンバーが存在するかチェック
  const targetMembership = await prisma.circleMember.findUnique({
    where: {
      circleId_userId: {
        circleId,
        userId: memberId,
      },
    },
  });

  if (!targetMembership) {
    return NextResponse.json(
      { error: "このメンバーはサークルに参加していません" },
      { status: 404 }
    );
  }

  // メンバーシップを削除（投稿データはそのまま残す）
  await prisma.circleMember.delete({
    where: {
      circleId_userId: {
        circleId,
        userId: memberId,
      },
    },
  });

  return NextResponse.json({ success: true });
}
