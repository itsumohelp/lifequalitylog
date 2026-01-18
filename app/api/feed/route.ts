import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export type FeedItem = {
  id: string;
  kind: "snapshot" | "expense";
  circleId: string;
  circleName: string;
  userId: string;
  userName: string;
  userImage: string | null;
  amount: number;
  description?: string;
  place?: string | null;
  category?: string;
  note?: string | null;
  createdAt: string;
};

// 全サークルの更新を統合して取得
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // ユーザーが参加しているサークルを取得
  const memberships = await prisma.circleMember.findMany({
    where: { userId },
    select: { circleId: true },
  });

  const circleIds = memberships.map((m) => m.circleId);

  if (circleIds.length === 0) {
    return NextResponse.json({ feed: [], circles: [] });
  }

  // サークル情報を取得
  const circles = await prisma.circle.findMany({
    where: { id: { in: circleIds } },
    select: { id: true, name: true },
  });

  // 残高スナップショットを取得
  const snapshots = await prisma.circleSnapshot.findMany({
    where: { circleId: { in: circleIds } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      circle: { select: { name: true } },
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  // 支出を取得
  const expenses = await prisma.expense.findMany({
    where: { circleId: { in: circleIds } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      circle: { select: { name: true } },
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  // 統合してソート
  const feed: FeedItem[] = [
    ...snapshots.map((s) => ({
      id: `snapshot-${s.id}`,
      kind: "snapshot" as const,
      circleId: s.circleId,
      circleName: s.circle.name,
      userId: s.userId,
      userName: s.user?.name || s.user?.email || "不明",
      userImage: s.user?.image || null,
      amount: s.amount,
      note: s.note,
      createdAt: s.createdAt.toISOString(),
    })),
    ...expenses.map((e) => ({
      id: `expense-${e.id}`,
      kind: "expense" as const,
      circleId: e.circleId,
      circleName: e.circle.name,
      userId: e.userId,
      userName: e.user?.name || e.user?.email || "不明",
      userImage: e.user?.image || null,
      amount: e.amount,
      description: e.description,
      place: e.place,
      category: e.category,
      createdAt: e.createdAt.toISOString(),
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({
    feed: feed.slice(0, 50),
    circles: circles.map((c) => ({ id: c.id, name: c.name })),
  });
}
