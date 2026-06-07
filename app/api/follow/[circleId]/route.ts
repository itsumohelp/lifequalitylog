import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

type Params = { params: Promise<{ circleId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { circleId } = await params;
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const [followerCount, follow] = await Promise.all([
    prisma.circleFollow.count({ where: { circleId } }),
    userId
      ? prisma.circleFollow.findUnique({ where: { userId_circleId: { userId, circleId } } })
      : Promise.resolve(null),
  ]);

  return NextResponse.json({ followerCount, isFollowing: !!follow });
}

export async function POST(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { circleId } = await params;
  const userId = session.user.id;

  const circle = await prisma.circle.findUnique({ where: { id: circleId }, select: { isPublic: true } });
  if (!circle?.isPublic) {
    return NextResponse.json({ error: "Circle not found or not public" }, { status: 404 });
  }

  await prisma.circleFollow.upsert({
    where: { userId_circleId: { userId, circleId } },
    create: { userId, circleId, lastCheckedAt: new Date() },
    update: {},
  });

  const followerCount = await prisma.circleFollow.count({ where: { circleId } });
  return NextResponse.json({ followerCount, isFollowing: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { circleId } = await params;
  const userId = session.user.id;

  await prisma.circleFollow.deleteMany({ where: { userId, circleId } });

  const followerCount = await prisma.circleFollow.count({ where: { circleId } });
  return NextResponse.json({ followerCount, isFollowing: false });
}

export async function PATCH(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { circleId } = await params;
  const userId = session.user.id;

  await prisma.circleFollow.updateMany({
    where: { userId, circleId },
    data: { lastCheckedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
