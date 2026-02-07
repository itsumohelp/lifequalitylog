import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import UnifiedChat from "../componets/UnifiedChat";
import Link from "next/link";

type FeedItem = {
  id: string;
  kind: "snapshot" | "expense" | "income";
  circleId: string;
  circleName: string;
  userId: string;
  userName: string;
  userImage: string | null;
  amount: number;
  circleBalanceAfter?: number; // この操作後のサークル残高
  snapshotDiff?: number | null; // 前回残高との差分（null = 初回）
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
  let circles: { id: string; name: string; adminName: string }[] = [];
  let circleBalances: { circleId: string; circleName: string; balance: number; monthlyExpense: number; allTimeExpense: number }[] = [];
  let totalBalance = 0;
  let monthlyExpense = 0;
  let dailyExpense = 0;
  let tagSummary: TagSummaryItem[] = [];

  if (hasCircles) {
    // サークル情報を取得（ADMIN名、currentBalanceも含む）
    const circlesWithAdmin = await prisma.circle.findMany({
      where: { id: { in: circleIds } },
      orderBy: { createdAt: "asc" }, // 作成順（古い順）で並べる
      select: {
        id: true,
        name: true,
        currentBalance: true,
        members: {
          where: { role: "ADMIN" },
          select: {
            user: {
              select: {
                displayName: true,
                name: true,
              },
            },
          },
          take: 1,
        },
      },
    });

    circles = circlesWithAdmin.map((c) => ({
      id: c.id,
      name: c.name,
      adminName: c.members[0]?.user?.displayName || c.members[0]?.user?.name || "不明",
    }));

    // 残高スナップショットを取得（全サークル分）
    const snapshots = await prisma.circleSnapshot.findMany({
      where: { circleId: { in: circleIds } },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        circle: { select: { name: true } },
        user: { select: { id: true, name: true, displayName: true, email: true, image: true } },
      },
    });

    // 支出を取得（全サークル分）
    const expenses = await prisma.expense.findMany({
      where: { circleId: { in: circleIds } },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        circle: { select: { name: true } },
        user: { select: { id: true, name: true, displayName: true, email: true, image: true } },
      },
    });

    // 収入を取得（全サークル分）
    const incomes = await prisma.income.findMany({
      where: { circleId: { in: circleIds } },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        circle: { select: { name: true } },
        user: { select: { id: true, name: true, displayName: true, email: true, image: true } },
      },
    });

    // 各サークルの残高を取得（キャッシュから）
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 当月の月次集計を取得（全サークル分）
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthlySnapshotsAll = await prisma.monthlySnapshot.findMany({
      where: {
        circleId: { in: circleIds },
        yearMonth,
      },
    });

    // サークルごとのMonthlySnapshotをマップに変換
    const monthlySnapshotMap = new Map<string, number>();
    for (const ms of monthlySnapshotsAll) {
      monthlySnapshotMap.set(ms.circleId, ms.totalExpense);
    }

    // 全期間の支出をサークルごとに集計
    const allTimeExpenseByCircle = await prisma.expense.groupBy({
      by: ["circleId"],
      where: { circleId: { in: circleIds } },
      _sum: { amount: true },
    });
    const allTimeExpenseMap = new Map<string, number>();
    for (const item of allTimeExpenseByCircle) {
      allTimeExpenseMap.set(item.circleId, item._sum.amount || 0);
    }

    // 当日の支出を集計（管理者サークルのみ）
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dailyExpenseResult = await prisma.expense.aggregate({
      where: {
        circleId: { in: adminCircleIds },
        createdAt: { gte: startOfToday },
      },
      _sum: { amount: true },
    });
    dailyExpense = dailyExpenseResult._sum.amount || 0;

    for (const circleId of circleIds) {
      const circleData = circlesWithAdmin.find((c) => c.id === circleId);
      const circleMonthlyExpense = monthlySnapshotMap.get(circleId) || 0;
      const circleAllTimeExpense = allTimeExpenseMap.get(circleId) || 0;

      // サークル別残高リストに追加（currentBalanceキャッシュを使用）
      circleBalances.push({
        circleId,
        circleName: circleData?.name || "（名前なし）",
        balance: circleData?.currentBalance || 0,
        monthlyExpense: circleMonthlyExpense,
        allTimeExpense: circleAllTimeExpense,
      });

      // 管理者サークルのみ合計に加算
      if (adminCircleIds.includes(circleId)) {
        totalBalance += circleData?.currentBalance || 0;
        monthlyExpense += circleMonthlyExpense;
      }
    }

    // 各トランザクション時点のサークル残高を計算
    // サークルごとに全トランザクションを時系列順で処理して残高を計算
    const circleBalanceAfterMap = new Map<string, number>();

    for (const circleId of circleIds) {
      // このサークルの最新スナップショットを取得
      const latestSnapshot = snapshots.find((s) => s.circleId === circleId);
      const snapshotDate = latestSnapshot ? new Date(latestSnapshot.createdAt) : null;
      const snapshotAmount = latestSnapshot?.amount || 0;

      // スナップショット以降のトランザクションを時系列順に取得
      type Transaction = { id: string; type: "expense" | "income" | "snapshot"; amount: number; createdAt: Date };
      const transactions: Transaction[] = [];

      // スナップショット自体も追加
      for (const s of snapshots.filter((s) => s.circleId === circleId)) {
        transactions.push({
          id: s.id,
          type: "snapshot",
          amount: s.amount,
          createdAt: new Date(s.createdAt),
        });
      }

      // 支出を追加
      for (const e of expenses.filter((e) => e.circleId === circleId)) {
        transactions.push({
          id: e.id,
          type: "expense",
          amount: e.amount,
          createdAt: new Date(e.createdAt),
        });
      }

      // 収入を追加
      for (const i of incomes.filter((i) => i.circleId === circleId)) {
        transactions.push({
          id: i.id,
          type: "income",
          amount: i.amount,
          createdAt: new Date(i.createdAt),
        });
      }

      // 時系列順にソート
      transactions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      // 残高を計算しながら処理
      let runningBalance = 0;
      for (const tx of transactions) {
        if (tx.type === "snapshot") {
          runningBalance = tx.amount;
        } else if (tx.type === "expense") {
          runningBalance -= tx.amount;
        } else if (tx.type === "income") {
          runningBalance += tx.amount;
        }
        circleBalanceAfterMap.set(tx.id, runningBalance);
      }
    }

    // 統合してソート（最新7日分）
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    feed = [
      ...snapshots
        .filter((s) => new Date(s.createdAt) >= sevenDaysAgo)
        .map((s) => ({
          id: `snapshot-${s.id}`,
          kind: "snapshot" as const,
          circleId: s.circleId,
          circleName: s.circle.name,
          userId: s.userId,
          userName: s.user?.displayName || s.user?.name || s.user?.email || "不明",
          userImage: s.user?.image || null,
          amount: s.amount,
          snapshotDiff: s.diffFromPrev, // データベースに保存された差分を使用
          note: s.note,
          createdAt: s.createdAt.toISOString(),
        })),
      ...expenses
        .filter((e) => new Date(e.createdAt) >= sevenDaysAgo)
        .map((e) => ({
          id: `expense-${e.id}`,
          kind: "expense" as const,
          circleId: e.circleId,
          circleName: e.circle.name,
          userId: e.userId,
          userName: e.user?.displayName || e.user?.name || e.user?.email || "不明",
          userImage: e.user?.image || null,
          amount: -e.amount,
          circleBalanceAfter: circleBalanceAfterMap.get(e.id),
          description: e.description,
          place: e.place,
          category: e.category,
          tags: e.tags,
          createdAt: e.createdAt.toISOString(),
        })),
      ...incomes
        .filter((i) => new Date(i.createdAt) >= sevenDaysAgo)
        .map((i) => ({
          id: `income-${i.id}`,
          kind: "income" as const,
          circleId: i.circleId,
          circleName: i.circle.name,
          userId: i.userId,
          userName: i.user?.displayName || i.user?.name || i.user?.email || "不明",
          userImage: i.user?.image || null,
          amount: i.amount,
          description: i.description,
          source: i.source,
          category: i.category,
          tags: i.tags,
          createdAt: i.createdAt.toISOString(),
        })),
    ]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // サークル×タグ別集計を計算（全期間）
    // 全期間の支出を取得
    const allExpenses = await prisma.expense.findMany({
      where: { circleId: { in: circleIds } },
      select: {
        circleId: true,
        amount: true,
        tags: true,
      },
    });

    const tagMap = new Map<string, { circleId: string; circleName: string; total: number; count: number }>();

    for (const e of allExpenses) {
      if (e.tags && e.tags.length > 0) {
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
            circleBalances={circleBalances}
            currentUserId={userId}
            userRoles={memberships.map((m) => ({ circleId: m.circleId, role: m.role }))}
            tagSummary={tagSummary}
            initialTotalBalance={totalBalance}
            initialMonthlyExpense={monthlyExpense}
            initialDailyExpense={dailyExpense}
            adminCircleIds={adminCircleIds}
          />
        )}
      </div>
    </div>
  );
}
