import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { collected, bump, toggleCollectedUserId } = body;

  if (collected === undefined && bump !== true && !toggleCollectedUserId) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const member = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId: notification.circleId, userId: session.user.id } },
  });
  if (!member) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  // 投稿者またはADMINのみ操作可
  if (notification.actorUserId !== session.user.id && member.role !== "ADMIN") {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  // 割り勘メンバーごとの回収済みトグル
  if (toggleCollectedUserId) {
    let msgObj: Record<string, unknown>;
    try {
      msgObj = JSON.parse(notification.message);
    } catch {
      return NextResponse.json({ error: "Invalid message format" }, { status: 400 });
    }
    if (msgObj.type !== "WARIKAN") {
      return NextResponse.json({ error: "Not a warikan notification" }, { status: 400 });
    }
    const collectedUserIds: string[] = Array.isArray(msgObj.collectedUserIds)
      ? (msgObj.collectedUserIds as string[])
      : [];
    const idx = collectedUserIds.indexOf(toggleCollectedUserId);
    if (idx >= 0) {
      collectedUserIds.splice(idx, 1);
    } else {
      collectedUserIds.push(toggleCollectedUserId);
    }
    msgObj.collectedUserIds = collectedUserIds;
    const updated = await prisma.notification.update({
      where: { id },
      data: { message: JSON.stringify(msgObj) },
    });
    return NextResponse.json({ notification: updated });
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: {
      ...(collected !== undefined && { collected }),
      ...(bump === true && { bumpedAt: new Date() }),
    },
  });

  return NextResponse.json({ notification: updated });
}

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
