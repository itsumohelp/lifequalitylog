import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export type InboxItem = {
  id: string;
  kind: "claim" | "warikan_reminder" | "notice";
  title: string;
  body: string;
  circleName?: string;
  amount?: number;
  itemUrl?: string; // /item/{type}-{rawId} へのリンク
  createdAt: string;
  isRead: boolean;
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notifLastReadAt: true },
  });
  const lastReadAt = user?.notifLastReadAt ?? null;

  const items: InboxItem[] = [];

  // 1. 自分への請求（未回収の claimee expense）
  const claimedExpenses = await prisma.expense.findMany({
    where: { claimeeUserId: userId, NOT: { claimeeCollected: true } },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      circle: { select: { name: true } },
      user: { select: { displayName: true, name: true } },
    },
  });

  for (const e of claimedExpenses) {
    const poster = e.user?.displayName || e.user?.name || "メンバー";
    const isRead = lastReadAt !== null && e.createdAt <= lastReadAt;
    items.push({
      id: `claim-${e.id}`,
      kind: "claim",
      title: `${poster} さんから請求`,
      body: `${e.description ?? "支出"} ¥${e.amount.toLocaleString("ja-JP")}`,
      circleName: e.circle.name,
      amount: e.amount,
      itemUrl: `/item/expense-${e.id}`,
      createdAt: e.createdAt.toISOString(),
      isRead,
    });
  }

  // 2. 自分が投稿した割り勘の未回収リマインダー（3日以上経過）
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const myWarikans = await prisma.notification.findMany({
    where: { actorUserId: userId, type: "WARIKAN_RESULT", createdAt: { lt: threeDaysAgo } },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { circle: { select: { name: true } } },
  });

  for (const n of myWarikans) {
    try {
      const msg = JSON.parse(n.message);
      if (msg.type !== "WARIKAN") continue;
      const members: { userId?: string; name: string }[] = msg.members ?? [];
      const collectedIds: string[] = msg.collectedUserIds ?? [];
      const uncollected = members.filter(
        (m) => m.userId && !collectedIds.includes(m.userId)
      );
      if (uncollected.length === 0) continue;

      const names = uncollected.map((m) => m.name).join("、");
      const isRead = lastReadAt !== null && n.createdAt <= lastReadAt;
      items.push({
        id: `warikan-${n.id}`,
        kind: "warikan_reminder",
        title: "割り勘 未回収リマインダー",
        body: `${names} が未回収です`,
        circleName: n.circle.name,
        amount: typeof msg.perPerson === "number" ? msg.perPerson : undefined,
        itemUrl: `/item/notification-${n.id}`,
        createdAt: n.createdAt.toISOString(),
        isRead,
      });
    } catch {
      // malformed JSON
    }
  }

  // 3. 運営からのお知らせ
  const notices = await prisma.notice.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  for (const notice of notices) {
    const isRead = lastReadAt !== null && notice.createdAt <= lastReadAt;
    items.push({
      id: `notice-${notice.id}`,
      kind: "notice",
      title: notice.title,
      body: notice.body ?? "",
      itemUrl: notice.link ?? undefined,
      createdAt: notice.createdAt.toISOString(),
      isRead,
    });
  }

  // 日時降順でソート
  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const unreadCount = items.filter((i) => !i.isRead).length;

  return NextResponse.json({ items, unreadCount });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { notifLastReadAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
