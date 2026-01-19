import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import UnifiedChat from "../componets/UnifiedChat";
import Link from "next/link";

function formatYen(amount: number) {
  return new Intl.NumberFormat("ja-JP").format(amount);
}

type FeedItem = {
  id: string;
  kind: "snapshot" | "expense" | "income";
  circleId: string;
  circleName: string;
  userId: string;
  userName: string;
  userImage: string | null;
  amount: number;
  cumulativeExpense?: number;
  description?: string;
  place?: string | null;
  source?: string | null;
  category?: string;
  tags?: string[];
  note?: string | null;
  createdAt: string;
};

type TagSummaryItem = {
  circleId: string;
  circleName: string;
  tag: string;
  total: number;
  count: number;
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session || !session.user?.id) {
    redirect("/");
  }

  const userId = session.user.id as string;

  // ユーザーが参加しているサークルを取得（ロール情報も含む）
  const memberships = await prisma.circleMember.findMany({
    where: { userId },
    select: { circleId: true, role: true },
  });

  const circleIds = memberships.map((m) => m.circleId);
  const adminCircleIds = memberships
    .filter((m) => m.role === "ADMIN")
    .map((m) => m.circleId);
  const hasCircles = circleIds.length > 0;

  let feed: FeedItem[] = [];
  let circles: { id: string; name: string }[] = [];
  let totalBalance = 0;
  let yesterdayBalance = 0;
  let balanceDiff = 0;
  let monthlyExpense = 0;
  let tagSummary: TagSummaryItem[] = [];

  if (hasCircles) {
    // サークル情報を取得
    circles = await prisma.circle.findMany({
      where: { id: { in: circleIds } },
      select: { id: true, name: true },
    });

    // 残高スナップショットを取得（全サークル分）
    const snapshots = await prisma.circleSnapshot.findMany({
      where: { circleId: { in: circleIds } },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        circle: { select: { name: true } },
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    // 支出を取得（全サークル分）
    const expenses = await prisma.expense.findMany({
      where: { circleId: { in: circleIds } },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        circle: { select: { name: true } },
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    // 収入を取得（全サークル分）
    const incomes = await prisma.income.findMany({
      where: { circleId: { in: circleIds } },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        circle: { select: { name: true } },
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    // 管理者サークルの残高計算
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (const circleId of adminCircleIds) {
      const latestSnapshot = snapshots.find((s) => s.circleId === circleId);
      if (!latestSnapshot) continue;

      const snapshotDate = new Date(latestSnapshot.createdAt);
      let circleBalance = latestSnapshot.amount;

      // スナップショット以降の支出を引く
      const expensesAfterSnapshot = expenses.filter(
        (e) => e.circleId === circleId && new Date(e.createdAt) > snapshotDate
      );
      const expenseSum = expensesAfterSnapshot.reduce((sum, e) => sum + e.amount, 0);
      circleBalance -= expenseSum;

      // スナップショット以降の収入を足す
      const incomesAfterSnapshot = incomes.filter(
        (i) => i.circleId === circleId && new Date(i.createdAt) > snapshotDate
      );
      const incomeSum = incomesAfterSnapshot.reduce((sum, i) => sum + i.amount, 0);
      circleBalance += incomeSum;

      totalBalance += circleBalance;

      // 昨日時点の残高を計算
      const yesterdayEndSnapshot = snapshots.find(
        (s) => s.circleId === circleId && new Date(s.createdAt) < todayStart
      );

      if (yesterdayEndSnapshot) {
        let yesterdayCircleBalance = yesterdayEndSnapshot.amount;
        const expensesAfterYesterdaySnapshot = expenses.filter(
          (e) =>
            e.circleId === circleId &&
            new Date(e.createdAt) > new Date(yesterdayEndSnapshot.createdAt) &&
            new Date(e.createdAt) < todayStart
        );
        const yesterdayExpenseSum = expensesAfterYesterdaySnapshot.reduce(
          (sum, e) => sum + e.amount,
          0
        );
        yesterdayCircleBalance -= yesterdayExpenseSum;
        yesterdayBalance += yesterdayCircleBalance;
      }
    }

    balanceDiff = totalBalance - yesterdayBalance;

    // 当月の月次集計を取得
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    if (adminCircleIds.length > 0) {
      const monthlySnapshots = await prisma.monthlySnapshot.findMany({
        where: {
          circleId: { in: adminCircleIds },
          yearMonth,
        },
      });
      monthlyExpense = monthlySnapshots.reduce((sum: number, m) => sum + m.totalExpense, 0);
    }

    // 今月の支出累計をサークルごとに計算
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const expensesSortedAsc = [...expenses]
      .filter((e) => new Date(e.createdAt) >= startOfMonth)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const expenseCumulativeMap = new Map<string, number>();
    const circleRunningTotals = new Map<string, number>();
    for (const e of expensesSortedAsc) {
      const currentTotal = circleRunningTotals.get(e.circleId) || 0;
      const newTotal = currentTotal + e.amount;
      circleRunningTotals.set(e.circleId, newTotal);
      expenseCumulativeMap.set(e.id, newTotal);
    }

    // 統合してソート（最新10件のみ）
    feed = [
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
        amount: -e.amount,
        cumulativeExpense: expenseCumulativeMap.get(e.id),
        description: e.description,
        place: e.place,
        category: e.category,
        tags: e.tags,
        createdAt: e.createdAt.toISOString(),
      })),
      ...incomes.map((i) => ({
        id: `income-${i.id}`,
        kind: "income" as const,
        circleId: i.circleId,
        circleName: i.circle.name,
        userId: i.userId,
        userName: i.user?.name || i.user?.email || "不明",
        userImage: i.user?.image || null,
        amount: i.amount,
        description: i.description,
        source: i.source,
        category: i.category,
        tags: i.tags,
        createdAt: i.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .reverse();

    // サークル×タグ別集計を計算（今月分）
    const tagMap = new Map<string, { circleId: string; circleName: string; total: number; count: number }>();

    for (const e of expenses) {
      if (new Date(e.createdAt) >= startOfMonth && e.tags && e.tags.length > 0) {
        const circle = circles.find((c) => c.id === e.circleId);
        for (const tag of e.tags) {
          const key = `${e.circleId}:${tag}`;
          const existing = tagMap.get(key) || {
            circleId: e.circleId,
            circleName: circle?.name || "不明",
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

    tagSummary = Array.from(tagMap.entries())
      .map(([key, data]) => ({
        tag: key.split(":").slice(1).join(":"),
        ...data,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }

  return (
    <div className="h-dvh bg-white overflow-hidden">
      <div className="mx-auto max-w-md flex flex-col h-full">
        {/* 合計残高（上部固定） */}
        <div className="flex-shrink-0 bg-white px-3 pt-2 pb-1.5 border-b border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-600">合計残高</span>
            <Link
              href="/circles"
              className="text-[10px] text-slate-500 hover:text-slate-700"
            >
              サークル管理 →
            </Link>
          </div>
          <div className="rounded-xl bg-slate-900 px-3 py-1.5">
            <div className="flex items-center justify-center gap-2">
              <span className="font-semibold text-white text-xl">
                ¥{formatYen(totalBalance)}
              </span>
              {yesterdayBalance !== 0 && (
                <span
                  className={`text-xs ${
                    balanceDiff >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  ({balanceDiff >= 0 ? "+" : ""}¥{formatYen(balanceDiff)})
                </span>
              )}
            </div>
            {/* 当月支出 */}
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <span className="text-[10px] text-slate-400">当月支出</span>
              <span className="text-[10px] text-red-400">
                -¥{formatYen(monthlyExpense)}
              </span>
            </div>
          </div>

          {/* タグ別集計（今月・金額順） */}
          {tagSummary.length > 0 && (
            <div className="mt-1.5 overflow-x-auto pb-0.5">
              <div className="flex gap-1.5 whitespace-nowrap">
                {tagSummary.map((item, idx) => (
                  <div
                    key={`${item.circleId}-${item.tag}-${idx}`}
                    className="flex-shrink-0 bg-slate-100 rounded px-2 py-1 border border-slate-200"
                  >
                    <div className="text-[9px] text-slate-500">
                      {item.circleName}
                    </div>
                    <div className="text-[9px] text-slate-700">
                      🏷️{item.tag} <span className="text-red-500">-¥{formatYen(item.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* メインコンテンツ */}
        {!hasCircles ? (
          <div className="flex-1 flex items-center justify-center text-center px-6">
            <div>
              <p className="text-slate-700 mb-2">
                まだサークルに参加していません
              </p>
              <p className="text-sm text-slate-500 mb-4">
                サークルを作成するか、招待リンクから参加してください
              </p>
              <Link
                href="/circles/new"
                className="inline-block bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                サークルを作成
              </Link>
            </div>
          </div>
        ) : (
          <UnifiedChat
            initialFeed={feed}
            circles={circles}
            currentUserId={userId}
          />
        )}
      </div>
    </div>
  );
}
