import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const { searchParams } = new URL(request.url);
  const targetCircleId = searchParams.get("circleId");

  try {
    // ユーザーのサークルを全て取得
    const memberships = await prisma.circleMember.findMany({
      where: { userId },
      select: { circleId: true },
    });

    if (memberships.length === 0) {
      return NextResponse.json({ summary: [] });
    }

    const memberCircleIds = memberships.map((m) => m.circleId);

    // 特定のサークルが指定されていて、ユーザーがメンバーでない場合はエラー
    if (targetCircleId && !memberCircleIds.includes(targetCircleId)) {
      return NextResponse.json({ error: "Not a member of this circle" }, { status: 403 });
    }

    // 集計対象のサークルID（指定があればそれ、なければ全サークル）
    const circleIds = targetCircleId ? [targetCircleId] : memberCircleIds;

    // サークル情報を取得
    const circles = await prisma.circle.findMany({
      where: { id: { in: circleIds } },
      select: { id: true, name: true },
    });
    const circleMap = new Map(circles.map((c) => [c.id, c.name]));

    // 今月の支出を取得
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const expenses = await prisma.expense.findMany({
      where: {
        circleId: { in: circleIds },
        createdAt: { gte: startOfMonth },
      },
      select: {
        circleId: true,
        amount: true,
        tags: true,
      },
    });

    // サークル×タグ別に集計
    const tagMap = new Map<string, { circleId: string; circleName: string; tag: string; total: number; count: number }>();

    for (const e of expenses) {
      if (e.tags && e.tags.length > 0) {
        for (const tag of e.tags) {
          const key = `${e.circleId}:${tag}`;
          const existing = tagMap.get(key) || {
            circleId: e.circleId,
            circleName: circleMap.get(e.circleId) || "不明",
            tag,
            total: 0,
            count: 0,
          };
          tagMap.set(key, {
            ...existing,
            total: existing.total + e.amount,
            count: existing.count + 1,
          });
        }
      }
    }

    // 金額順に並べる
    const summary = Array.from(tagMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Summary error:", error);
    return NextResponse.json(
      { error: "集計の取得に失敗しました" },
      { status: 500 }
    );
  }
}
