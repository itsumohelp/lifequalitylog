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
  tags?: string[];
  note?: string | null;
  createdAt: string;
};

type TagSummary = {
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
  // 管理者（ADMIN）のサークルIDのみ
  const adminCircleIds = memberships
    .filter((m) => m.role === "ADMIN")
    .map((m) => m.circleId);
  const hasCircles = circleIds.length > 0;

  let feed: FeedItem[] = [];
  let circles: { id: string; name: string }[] = [];
  let totalBalance = 0;
  let yesterdayBalance = 0;
  let balanceDiff = 0;
  let tagSummary: TagSummary[] = [];

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

    // 管理者サークルの残高計算（最新残高 - 残高記入後の支出合計）
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (const circleId of adminCircleIds) {
      // このサークルの最新残高スナップショット
      const latestSnapshot = snapshots.find((s) => s.circleId === circleId);
      if (!latestSnapshot) continue;

      const snapshotDate = new Date(latestSnapshot.createdAt);

      // 最新残高
      let circleBalance = latestSnapshot.amount;

      // スナップショット以降の支出を引く
      const expensesAfterSnapshot = expenses.filter(
        (e) => e.circleId === circleId && new Date(e.createdAt) > snapshotDate
      );
      const expenseSum = expensesAfterSnapshot.reduce((sum, e) => sum + e.amount, 0);
      circleBalance -= expenseSum;

      totalBalance += circleBalance;

      // 昨日時点の残高を計算
      // 昨日終了時点で有効だった最新のスナップショット
      const yesterdayEndSnapshot = snapshots.find(
        (s) => s.circleId === circleId && new Date(s.createdAt) < todayStart
      );

      if (yesterdayEndSnapshot) {
        let yesterdayCircleBalance = yesterdayEndSnapshot.amount;
        // そのスナップショット以降、昨日終了までの支出を引く
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

    // 統合してソート
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
        amount: -e.amount, // 支出はマイナス表記
        description: e.description,
        place: e.place,
        category: e.category,
        tags: e.tags,
        createdAt: e.createdAt.toISOString(),
      })),
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // タグ別集計を計算（今月分）
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const tagMap = new Map<string, { total: number; count: number }>();

    for (const e of expenses) {
      if (new Date(e.createdAt) >= startOfMonth && e.tags) {
        for (const tag of e.tags) {
          const existing = tagMap.get(tag) || { total: 0, count: 0 };
          tagMap.set(tag, {
            total: existing.total + e.amount,
            count: existing.count + 1,
          });
        }
      }
    }

    tagSummary = Array.from(tagMap.entries())
      .map(([tag, data]) => ({ tag, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5); // 上位5件
  }

  return (
    <div className="h-full bg-white overflow-hidden">
      <div className="mx-auto max-w-md flex flex-col h-full">
        {/* 合計残高（上部固定） */}
        <div className="sticky top-0 z-10 bg-white px-3 pt-2 pb-1.5 border-b border-slate-100">
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
          </div>

          {/* タグ別集計（今月） */}
          {tagSummary.length > 0 && (
            <div className="mt-1.5">
              <div className="flex gap-1 overflow-x-auto pb-0.5">
                {tagSummary.map((item) => (
                  <div
                    key={item.tag}
                    className="flex-shrink-0 bg-slate-100 rounded px-1.5 py-0.5 border border-slate-200"
                  >
                    <span className="text-[9px] text-slate-600">
                      {item.tag} <span className="text-red-500">-¥{formatYen(item.total)}</span>
                    </span>
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
