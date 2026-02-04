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

    // 全期間の支出を取得
    const allExpenses = await prisma.expense.findMany({
      where: {
        circleId: { in: circleIds },
      },
      select: {
        circleId: true,
        amount: true,
        tags: true,
        createdAt: true,
      },
    });

    // 今月の開始日
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 全期間のサークル×タグ別集計
    const allTimeTagMap = new Map<string, { circleId: string; circleName: string; tag: string; total: number; count: number }>();
    // 今月のサークル×タグ別集計
    const monthlyTagMap = new Map<string, { circleId: string; circleName: string; tag: string; total: number; count: number }>();

    for (const e of allExpenses) {
      if (e.tags && e.tags.length > 0) {
        const isThisMonth = new Date(e.createdAt) >= startOfMonth;
        for (const tag of e.tags) {
          const key = `${e.circleId}:${tag}`;

          // 全期間
          const existingAll = allTimeTagMap.get(key) || {
            circleId: e.circleId,
            circleName: circleMap.get(e.circleId) || "不明",
            tag,
            total: 0,
            count: 0,
          };
          allTimeTagMap.set(key, {
            ...existingAll,
            total: existingAll.total + e.amount,
            count: existingAll.count + 1,
          });

          // 今月分
          if (isThisMonth) {
            const existingMonthly = monthlyTagMap.get(key) || {
              circleId: e.circleId,
              circleName: circleMap.get(e.circleId) || "不明",
              tag,
              total: 0,
              count: 0,
            };
            monthlyTagMap.set(key, {
              ...existingMonthly,
              total: existingMonthly.total + e.amount,
              count: existingMonthly.count + 1,
            });
          }
        }
      }
    }

    // 金額順に並べる
    const allTimeSummary = Array.from(allTimeTagMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);

    const monthlySummary = Array.from(monthlyTagMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);

    return NextResponse.json({
      summary: monthlySummary, // 後方互換性のため
      allTimeSummary,
      monthlySummary,
    });
  } catch (error) {
    console.error("Summary error:", error);
    return NextResponse.json(
      { error: "集計の取得に失敗しました" },
      { status: 500 }
    );
  }
}
