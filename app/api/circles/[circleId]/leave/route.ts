import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

type Params = {
  params: Promise<{ circleId: string }>;
};

// サークルから離脱
export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const { circleId } = await params;

  // メンバーシップを確認
  const membership = await prisma.circleMember.findUnique({
    where: {
      circleId_userId: {
        circleId,
        userId,
      },
    },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "このサークルのメンバーではありません" },
      { status: 404 }
    );
  }

  // ADMINは離脱できない
  if (membership.role === "ADMIN") {
    return NextResponse.json(
      { error: "管理者はサークルから離脱できません" },
      { status: 400 }
    );
  }

  // メンバーシップを削除（登録した支出・収入・残高はそのまま残す）
  await prisma.circleMember.delete({
    where: {
      circleId_userId: {
        circleId,
        userId,
      },
    },
  });

  return NextResponse.json({ success: true });
}
