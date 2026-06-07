import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export type FollowedCircle = {
  circleId: string;
  circleName: string;
  isPublic: boolean;
  followerCount: number;
  followedAt: string;
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const follows = await prisma.circleFollow.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      circle: {
        select: {
          id: true,
          name: true,
          isPublic: true,
          _count: { select: { followers: true } },
        },
      },
    },
  });

  const result: FollowedCircle[] = follows.map((f) => ({
    circleId: f.circleId,
    circleName: f.circle.name,
    isPublic: f.circle.isPublic,
    followerCount: f.circle._count.followers,
    followedAt: f.createdAt.toISOString(),
  }));

  return NextResponse.json({ follows: result });
}
