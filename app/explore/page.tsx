import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import ExploreClient, { type CircleCard } from "./ExploreClient";

export const metadata: Metadata = {
  title: "みんなの家計 | CircleRun",
  description: "公開中のサークルを支出パターンで探してみよう。家族・カップル・一人暮らしなどのスタイルで絞り込めます。",
};

type SegmentKey = "family" | "couple" | "solo" | "frugal" | "leisure";

function classifySegment(
  memberCount: number,
  monthlyExpense: number,
  entertainmentPct: number,
): SegmentKey {
  const perPerson = memberCount > 0 ? monthlyExpense / memberCount : monthlyExpense;
  if (memberCount >= 3 || (monthlyExpense >= 150000 && memberCount >= 2)) return "family";
  if (memberCount === 2) return "couple";
  if (entertainmentPct >= 0.25 && monthlyExpense >= 15000) return "leisure";
  if (perPerson < 30000 && monthlyExpense > 3000) return "frugal";
  return "solo";
}

export default async function ExplorePage() {
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const jstYear = jstNow.getUTCFullYear();
  const jstMonth = jstNow.getUTCMonth();
  const startOfMonth = new Date(Date.UTC(jstYear, jstMonth, 1) - 9 * 60 * 60 * 1000);

  const publicCircles = await prisma.circle.findMany({
    where: { isPublic: true },
    select: { id: true, name: true },
    orderBy: { updatedAt: "desc" },
    take: 60,
  });

  if (publicCircles.length === 0) {
    return <ExploreClient circles={[]} />;
  }

  const ids = publicCircles.map((c) => c.id);

  const [memberRows, monthlyRows, categoryRows, tagExpenses] = await Promise.all([
    prisma.circleMember.groupBy({
      by: ["circleId"],
      where: { circleId: { in: ids } },
      _count: { userId: true },
    }),
    prisma.expense.groupBy({
      by: ["circleId"],
      where: { circleId: { in: ids }, createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.expense.groupBy({
      by: ["circleId", "category"],
      where: { circleId: { in: ids }, createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.expense.findMany({
      where: { circleId: { in: ids }, createdAt: { gte: startOfMonth } },
      select: { circleId: true, tags: true },
    }),
  ]);

  const memberMap = new Map(memberRows.map((r) => [r.circleId, r._count.userId]));
  const monthlyMap = new Map(monthlyRows.map((r) => [r.circleId, { amount: r._sum.amount ?? 0, count: r._count.id }]));

  const catMap = new Map<string, Record<string, number>>();
  for (const r of categoryRows) {
    if (!catMap.has(r.circleId)) catMap.set(r.circleId, {});
    catMap.get(r.circleId)![r.category] = r._sum.amount ?? 0;
  }

  const tagMap = new Map<string, Map<string, number>>();
  for (const e of tagExpenses) {
    if (!tagMap.has(e.circleId)) tagMap.set(e.circleId, new Map());
    for (const tag of e.tags) {
      const m = tagMap.get(e.circleId)!;
      m.set(tag, (m.get(tag) ?? 0) + 1);
    }
  }

  const circles: CircleCard[] = publicCircles
    .map((circle) => {
      const memberCount = memberMap.get(circle.id) ?? 1;
      const monthly = monthlyMap.get(circle.id) ?? { amount: 0, count: 0 };
      const cats = catMap.get(circle.id) ?? {};
      const entertainmentPct = (cats.ENTERTAINMENT ?? 0) / (monthly.amount || 1);

      const topTags = Array.from(tagMap.get(circle.id)?.entries() ?? [])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([t]) => t);

      const segmentKey = classifySegment(memberCount, monthly.amount, entertainmentPct);
      const segmentMeta: Record<SegmentKey, { label: string; emoji: string }> = {
        family:  { label: "ファミリー",  emoji: "👨‍👩‍👧" },
        couple:  { label: "カップル",    emoji: "💑" },
        solo:    { label: "一人暮らし",  emoji: "🏠" },
        frugal:  { label: "節約家計",    emoji: "🌱" },
        leisure: { label: "レジャー派",  emoji: "✈️" },
      };

      return {
        id: circle.id,
        name: circle.name,
        memberCount,
        monthlyExpense: monthly.amount,
        monthlyPostCount: monthly.count,
        topTags,
        segmentKey,
        segmentLabel: segmentMeta[segmentKey].label,
        segmentEmoji: segmentMeta[segmentKey].emoji,
      };
    })
    .filter((c) => c.monthlyPostCount > 0);

  return <ExploreClient circles={circles} />;
}
