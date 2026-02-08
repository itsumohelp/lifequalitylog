import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

type Params = {
  params: Promise<{ circleId: string }>;
};

// サークルメンバー一覧を取得
export async function GET(_request: Request, { params }: Params) {
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

  // メンバー一覧を取得
  const members = await prisma.circleMember.findMany({
    where: { circleId },
    select: {
      userId: true,
      role: true,
      user: {
        select: {
          id: true,
          name: true,
          displayName: true,
          image: true,
        },
      },
    },
  });

  const formattedMembers = members.map((m) => ({
    userId: m.userId,
    role: m.role,
    name: m.user.displayName || m.user.name || "未設定",
    image: m.user.image,
  }));

  return NextResponse.json({ members: formattedMembers });
}
