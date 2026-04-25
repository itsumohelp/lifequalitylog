import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const member = await prisma.circleMember.findUnique({
    where: {
      circleId_userId: {
        circleId: notification.circleId,
        userId: session.user.id,
      },
    },
  });

  if (!member) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  // EDITOR は自分の投稿のみ削除可
  if (member.role === "EDITOR" && notification.actorUserId !== session.user.id) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  await prisma.reaction.deleteMany({
    where: { targetType: "notification", targetId: id },
  });

  await prisma.notification.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
