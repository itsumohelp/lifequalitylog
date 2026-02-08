import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export type FeedItem = {
  id: string;
  kind: "snapshot" | "expense" | "income";
  circleId: string;
  circleName: string;
  userId: string;
  userName: string;
  userImage: string | null;
  amount: number;
  circleBalanceAfter?: number;
  snapshotDiff?: number | null;
  description?: string;
  place?: string | null;
  source?: string | null;
  category?: string;
  tags?: string[];
  note?: string | null;
  createdAt: string;
};

// 公開サークルの過去の実績を取得（認証不要）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const circleId = searchParams.get("circleId");
  const before = searchParams.get("before"); // ISO timestamp
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  if (!circleId) {
    return NextResponse.json({ error: "circleId is required" }, { status: 400 });
  }

  // サークル情報を取得（公開設定も確認）
  const circle = await prisma.circle.findUnique({
    where: { id: circleId },
    select: { name: true, isPublic: true },
  });

  if (!circle) {
    return NextResponse.json({ error: "Circle not found" }, { status: 404 });
  }

  // 非公開サークルの場合は403
  if (!circle.isPublic) {
    return NextResponse.json({ error: "Circle is not public" }, { status: 403 });
  }

  const beforeDate = before ? new Date(before) : new Date();

  // 残高スナップショットを取得（指定日時より前）
  const snapshots = await prisma.circleSnapshot.findMany({
    where: {
      circleId,
      createdAt: { lt: beforeDate },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    include: {
      user: { select: { id: true, name: true, displayName: true, image: true } },
    },
  });

  // 支出を取得（指定日時より前）
  const expenses = await prisma.expense.findMany({
    where: {
      circleId,
      createdAt: { lt: beforeDate },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    include: {
      user: { select: { id: true, name: true, displayName: true, image: true } },
    },
  });

  // 収入を取得（指定日時より前）
  const incomes = await prisma.income.findMany({
    where: {
      circleId,
      createdAt: { lt: beforeDate },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    include: {
      user: { select: { id: true, name: true, displayName: true, image: true } },
    },
  });

  // 統合してソート
  const allItems: FeedItem[] = [
    ...snapshots.map((s) => ({
      id: `snapshot-${s.id}`,
      kind: "snapshot" as const,
      circleId,
      circleName: circle.name,
      userId: s.userId,
      userName: s.user?.displayName || s.user?.name || "未設定",
      userImage: s.user?.image || null,
      amount: s.amount,
      snapshotDiff: s.diffFromPrev, // データベースに保存された差分を使用
      note: s.note,
      createdAt: s.createdAt.toISOString(),
    })),
    ...expenses.map((e) => ({
      id: `expense-${e.id}`,
      kind: "expense" as const,
      circleId,
      circleName: circle.name,
      userId: e.userId,
      userName: e.user?.displayName || e.user?.name || "未設定",
      userImage: e.user?.image || null,
      amount: -e.amount,
      description: e.description,
      place: e.place,
      category: e.category,
      tags: e.tags,
      createdAt: e.createdAt.toISOString(),
    })),
    ...incomes.map((i) => ({
      id: `income-${i.id}`,
      kind: "income" as const,
      circleId,
      circleName: circle.name,
      userId: i.userId,
      userName: i.user?.displayName || i.user?.name || "未設定",
      userImage: i.user?.image || null,
      amount: i.amount,
      description: i.description,
      source: i.source,
      category: i.category,
      tags: i.tags,
      createdAt: i.createdAt.toISOString(),
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // limitを超える分があるかチェック
  const hasMore = allItems.length > limit;
  const feed = allItems.slice(0, limit);

  return NextResponse.json({
    feed,
    hasMore,
  });
}
