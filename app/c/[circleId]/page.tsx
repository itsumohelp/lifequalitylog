import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import PublicFeed from "@/app/components/PublicFeed";

type FeedItem = {
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

type Params = { params: Promise<{ circleId: string }> };

export default async function PublicCirclePage({ params }: Params) {
  const { circleId } = await params;

  // サークル情報と公開設定を確認
  const circle = await prisma.circle.findUnique({
    where: { id: circleId },
    select: {
      id: true,
      name: true,
      currentBalance: true,
      isPublic: true,
    },
  });

  // 非公開または存在しない場合は404
  if (!circle || !circle.isPublic) {
    notFound();
  }

  // セッション取得（未ログインでもエラーにはならない）
  const session = await auth();
  const currentUserId = session?.user?.id || null;

  // 最近7日間のデータを取得
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [snapshots, expenses, incomes] = await Promise.all([
    prisma.circleSnapshot.findMany({
      where: { circleId, createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { displayName: true, name: true, image: true } },
      },
    }),
    prisma.expense.findMany({
      where: { circleId, createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { displayName: true, name: true, image: true } },
      },
    }),
    prisma.income.findMany({
      where: { circleId, createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { displayName: true, name: true, image: true } },
      },
    }),
  ]);

  // 各トランザクション時点のサークル残高を計算
  type Transaction = { id: string; type: "expense" | "income" | "snapshot"; amount: number; createdAt: Date };
  const transactions: Transaction[] = [];

  for (const s of snapshots) {
    transactions.push({
      id: s.id,
      type: "snapshot",
      amount: s.amount,
      createdAt: new Date(s.createdAt),
    });
  }

  for (const e of expenses) {
    transactions.push({
      id: e.id,
      type: "expense",
      amount: e.amount,
      createdAt: new Date(e.createdAt),
    });
  }

  for (const i of incomes) {
    transactions.push({
      id: i.id,
      type: "income",
      amount: i.amount,
      createdAt: new Date(i.createdAt),
    });
  }

  transactions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const circleBalanceAfterMap = new Map<string, number>();
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

  // スナップショットの差分を計算
  const snapshotDiffMap = new Map<string, number | null>();
  for (let i = 0; i < snapshots.length; i++) {
    const current = snapshots[i];
    const previous = snapshots[i + 1];
    if (previous) {
      snapshotDiffMap.set(current.id, current.amount - previous.amount);
    } else {
      snapshotDiffMap.set(current.id, null);
    }
  }

  // フィードを構築
  const feed: FeedItem[] = [
    ...snapshots.map((s) => ({
      id: `snapshot-${s.id}`,
      kind: "snapshot" as const,
      circleId: s.circleId,
      circleName: circle.name,
      userId: s.userId,
      userName: s.user?.displayName || s.user?.name || "不明",
      userImage: s.user?.image || null,
      amount: s.amount,
      snapshotDiff: snapshotDiffMap.get(s.id),
      note: s.note,
      createdAt: s.createdAt.toISOString(),
    })),
    ...expenses.map((e) => ({
      id: `expense-${e.id}`,
      kind: "expense" as const,
      circleId: e.circleId,
      circleName: circle.name,
      userId: e.userId,
      userName: e.user?.displayName || e.user?.name || "不明",
      userImage: e.user?.image || null,
      amount: -e.amount,
      circleBalanceAfter: circleBalanceAfterMap.get(e.id),
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
      circleName: circle.name,
      userId: i.userId,
      userName: i.user?.displayName || i.user?.name || "不明",
      userImage: i.user?.image || null,
      amount: i.amount,
      description: i.description,
      source: i.source,
      category: i.category,
      tags: i.tags,
      createdAt: i.createdAt.toISOString(),
    })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className="h-dvh bg-white overflow-hidden">
      <div className="mx-auto max-w-md flex flex-col h-full">
        <PublicFeed
          circle={{
            id: circle.id,
            name: circle.name,
            currentBalance: circle.currentBalance,
          }}
          feed={feed}
          isLoggedIn={!!currentUserId}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}
