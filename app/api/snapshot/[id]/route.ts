import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// 残高スナップショットを削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // スナップショットを取得
  const snapshot = await prisma.circleSnapshot.findUnique({
    where: { id },
  });

  if (!snapshot) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ユーザーがサークルメンバーか確認（ADMIN または EDITOR）
  const member = await prisma.circleMember.findUnique({
    where: {
      circleId_userId: {
        circleId: snapshot.circleId,
        userId: session.user.id,
      },
    },
  });

  if (!member || (member.role !== "ADMIN" && member.role !== "EDITOR")) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  // 関連するリアクションを削除
  await prisma.reaction.deleteMany({
    where: {
      targetType: "snapshot",
      targetId: id,
    },
  });

  // スナップショットを削除
  await prisma.circleSnapshot.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
