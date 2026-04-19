import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import UnifiedChat from "../componets/UnifiedChat";
import { Suspense } from "react";
import IOSAuthCallback from "../components/IOSAuthCallback";

type FeedItem = {
  id: string;
  kind: "snapshot" | "expense" | "income" | "notice" | "insight";
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
  noticeTitle?: string;
  noticeBody?: string | null;
  noticeLink?: string | null;
  insightText?: string;
  createdAt: string;
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

  // 初回ユーザー：「おはじめ」サークルを自動作成
  if (memberships.length === 0) {
    await prisma.circle.create({
      data: {
        name: "おはじめ",
        members: { create: { userId, role: "ADMIN" } },
      },
    });
    redirect("/dashboard");
  }

  const circleIds = memberships.map((m) => m.circleId);
  const adminCircleIds = memberships
    .filter((m) => m.role === "ADMIN")
    .map((m) => m.circleId);
  const hasCircles = circleIds.length > 0;

  let feed: FeedItem[] = [];
  let circles: { id: string; name: string; adminName: string; isPublic: boolean; allowNewMembers: boolean }[] = [];
  let circleBalances: { circleId: string; circleName: string; balance: number; monthlyExpense: number; allTimeExpense: number }[] = [];
  let totalBalance = 0;
  let monthlyExpense = 0;
  let dailyExpense = 0;

  if (hasCircles) {
    // サークル情報を取得（ADMIN名、currentBalanceも含む）
    const circlesWithAdmin = await prisma.circle.findMany({
      where: { id: { in: circleIds } },
      orderBy: { createdAt: "asc" }, // 作成順（古い順）で並べる
      select: {
        id: true,
        name: true,
        currentBalance: true,
        isPublic: true,
        allowNewMembers: true,
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
      adminName: c.members[0]?.user?.displayName || c.members[0]?.user?.name || "未設定",
      isPublic: c.isPublic,
      allowNewMembers: c.allowNewMembers,
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
    // JSTで日付を計算
    const now = new Date();
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const jstYear = jstNow.getUTCFullYear();
    const jstMonth = jstNow.getUTCMonth();
    const jstDate = jstNow.getUTCDate();

    // 当月の月次集計を取得（全サークル分）
    const yearMonth = `${jstYear}${String(jstMonth + 1).padStart(2, "0")}`;
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

    // 当日の支出を集計（管理者サークルのみ）JSTの0:00をUTCに変換
    const startOfToday = new Date(Date.UTC(jstYear, jstMonth, jstDate) - 9 * 60 * 60 * 1000);
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

    // 統合してソート（最新14日分）
    const sevenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    feed = [
      ...snapshots
        .filter((s) => new Date(s.createdAt) >= sevenDaysAgo)
        .map((s) => ({
          id: `snapshot-${s.id}`,
          kind: "snapshot" as const,
          circleId: s.circleId,
          circleName: s.circle.name,
          userId: s.userId,
          userName: s.user?.displayName || s.user?.name || "未設定",
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
          userName: e.user?.displayName || e.user?.name || "未設定",
          userImage: e.user?.image || null,
          amount: -e.amount,
          circleBalanceAfter: circleBalanceAfterMap.get(e.id),
          description: e.description,
          place: e.place,
          category: e.category,
          tags: e.tags,
          autoTags: e.autoTags,
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
          userName: i.user?.displayName || i.user?.name || "未設定",
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

    // 過去7日分のインサイトをフィードに追加（サークル単位）
    const insights = await prisma.userInsight.findMany({
      where: {
        userId,
        circleId: { in: circleIds },
        generatedAt: { gte: sevenDaysAgo },
      },
      orderBy: { generatedAt: "asc" },
    });

    const circleNameMap = new Map(circlesWithAdmin.map((c) => [c.id, c.name]));

    const insightItems: FeedItem[] = insights.map((ins) => ({
      id: `insight-${ins.id}`,
      kind: "insight" as const,
      circleId: ins.circleId ?? "",
      circleName: circleNameMap.get(ins.circleId ?? "") ?? "",
      userId: "",
      userName: "",
      userImage: null,
      amount: 0,
      insightText: ins.insight,
      createdAt: ins.generatedAt.toISOString(),
    }));

    feed = [...feed, ...insightItems].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  return (
    <div className="flex-1 bg-white flex flex-col min-h-0 overflow-hidden">
      <Suspense fallback={null}><IOSAuthCallback /></Suspense>
      <div className="mx-auto max-w-md flex flex-col flex-1 w-full min-h-0">
        {/* メインコンテンツ */}
        <UnifiedChat
            initialFeed={feed}
            circles={circles}
            circleBalances={circleBalances}
            currentUserId={userId}
            userRoles={memberships.map((m) => ({ circleId: m.circleId, role: m.role }))}
            initialTotalBalance={totalBalance}
            initialMonthlyExpense={monthlyExpense}
            initialDailyExpense={dailyExpense}
            adminCircleIds={adminCircleIds}
          />
      </div>
    </div>
  );
}
