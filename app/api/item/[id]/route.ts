import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const dashIndex = id.indexOf("-");
  if (dashIndex === -1) {
    return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
  }

  const type = id.substring(0, dashIndex);
  const rawId = id.substring(dashIndex + 1);

  type FeedItemResult = {
    id: string;
    kind: string;
    circleId: string;
    circleName: string;
    userId: string;
    userName: string;
    userImage: string | null;
    amount: number;
    description?: string;
    place?: string | null;
    source?: string | null;
    category?: string;
    tags?: string[];
    autoTags?: string[];
    note?: string | null;
    notificationMessage?: string;
    transactionDate?: string;
    claimeeUserId?: string;
    claimeeUserName?: string;
    claimeeUserImage?: string | null;
    claimeeNameCache?: string;
    snapshotDiff?: number | null;
    createdAt: string;
  };

  let circleId: string | null = null;
  let item: FeedItemResult | null = null;

  if (type === "expense") {
    const expense = await prisma.expense.findUnique({
      where: { id: rawId },
      include: {
        circle: { select: { name: true } },
        user: { select: { id: true, name: true, displayName: true, image: true } },
        claimee: { select: { id: true, name: true, displayName: true, image: true } },
      },
    });
    if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });
    circleId = expense.circleId;
    item = {
      id: `expense-${expense.id}`,
      kind: "expense",
      circleId: expense.circleId,
      circleName: expense.circle.name,
      userId: expense.userId,
      userName: expense.user?.displayName || expense.user?.name || "未設定",
      userImage: expense.user?.image || null,
      amount: -expense.amount,
      description: expense.description,
      place: expense.place,
      category: expense.category,
      tags: expense.tags,
      autoTags: expense.autoTags,
      transactionDate: expense.expenseDate.toISOString(),
      claimeeUserId: expense.claimee?.id,
      claimeeUserName: expense.claimee?.displayName || expense.claimee?.name || undefined,
      claimeeUserImage: expense.claimee?.image || null,
      claimeeNameCache: expense.claimeeNameCache || undefined,
      createdAt: expense.createdAt.toISOString(),
    };
  } else if (type === "income") {
    const income = await prisma.income.findUnique({
      where: { id: rawId },
      include: {
        circle: { select: { name: true } },
        user: { select: { id: true, name: true, displayName: true, image: true } },
      },
    });
    if (!income) return NextResponse.json({ error: "Not found" }, { status: 404 });
    circleId = income.circleId;
    item = {
      id: `income-${income.id}`,
      kind: "income",
      circleId: income.circleId,
      circleName: income.circle.name,
      userId: income.userId,
      userName: income.user?.displayName || income.user?.name || "未設定",
      userImage: income.user?.image || null,
      amount: income.amount,
      description: income.description,
      source: income.source,
      category: income.category,
      tags: income.tags,
      autoTags: income.autoTags,
      transactionDate: income.incomeDate.toISOString(),
      createdAt: income.createdAt.toISOString(),
    };
  } else if (type === "snapshot") {
    const snapshot = await prisma.circleSnapshot.findUnique({
      where: { id: rawId },
      include: {
        circle: { select: { name: true } },
        user: { select: { id: true, name: true, displayName: true, image: true } },
      },
    });
    if (!snapshot) return NextResponse.json({ error: "Not found" }, { status: 404 });
    circleId = snapshot.circleId;
    item = {
      id: `snapshot-${snapshot.id}`,
      kind: "snapshot",
      circleId: snapshot.circleId,
      circleName: snapshot.circle.name,
      userId: snapshot.userId,
      userName: snapshot.user?.displayName || snapshot.user?.name || "未設定",
      userImage: snapshot.user?.image || null,
      amount: snapshot.amount,
      note: snapshot.note,
      snapshotDiff: snapshot.diffFromPrev,
      createdAt: snapshot.createdAt.toISOString(),
    };
  } else if (type === "notification") {
    const notification = await prisma.notification.findUnique({
      where: { id: rawId },
      include: {
        circle: { select: { name: true } },
        actor: { select: { id: true, name: true, displayName: true, image: true } },
      },
    });
    if (!notification) return NextResponse.json({ error: "Not found" }, { status: 404 });
    circleId = notification.circleId;
    item = {
      id: `notification-${notification.id}`,
      kind: "notification",
      circleId: notification.circleId,
      circleName: notification.circle.name,
      userId: notification.actorUserId,
      userName: notification.actor?.displayName || notification.actor?.name || "メンバー",
      userImage: notification.actor?.image || null,
      amount: 0,
      notificationMessage: notification.message,
      createdAt: notification.createdAt.toISOString(),
    };
  } else {
    return NextResponse.json({ error: "Invalid item type" }, { status: 400 });
  }

  const member = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId: circleId!, userId: session.user.id } },
  });
  if (!member) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  return NextResponse.json({ item });
}
