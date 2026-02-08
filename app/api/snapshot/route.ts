import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// 残高スナップショットを登録
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { circleId, amount, note } = body;

  if (!circleId || typeof amount !== "number") {
    return NextResponse.json(
      { error: "circleId and amount are required" },
      { status: 400 },
    );
  }

  // ユーザーがサークルメンバーか確認（EDITOR以上）
  const member = await prisma.circleMember.findUnique({
    where: {
      circleId_userId: {
        circleId,
        userId: session.user.id,
      },
    },
  });

  if (!member || member.role === "VIEWER") {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  // 前回のスナップショットを取得して差分を計算
  const previousSnapshot = await prisma.circleSnapshot.findFirst({
    where: { circleId },
    orderBy: { createdAt: "desc" },
  });

  const snapshotDiff = previousSnapshot
    ? amount - previousSnapshot.amount
    : null;

  // スナップショットを登録
  const snapshot = await prisma.circleSnapshot.create({
    data: {
      circleId,
      userId: session.user.id,
      amount,
      note: note || null,
      snapshotDate: new Date(),
      signature: "dummy",
      signatureAlgo: "none",
      signatureAt: new Date(),
      isSignatureVerified: false,
      diffFromPrev: snapshotDiff,
    },
    include: {
      circle: { select: { name: true } },
      user: { select: { displayName: true, name: true, image: true } },
    },
  });

  // サークルのcurrentBalanceをスナップショットの金額で上書き
  const circleBeforeSnapshot = await prisma.circle.findUnique({
    where: { id: circleId },
    select: { currentBalance: true },
  });
  const balanceBefore = circleBeforeSnapshot!.currentBalance;

  await prisma.circle.update({
    where: { id: circleId },
    data: { currentBalance: amount },
  });

  await prisma.balanceTransaction.create({
    data: {
      circleId,
      userId: session.user.id,
      type: "SNAPSHOT",
      isDelete: false,
      amount,
      balanceBefore,
      balanceAfter: amount,
    },
  });

  return NextResponse.json({
    snapshot: {
      id: `snapshot-${snapshot.id}`,
      kind: "snapshot",
      circleId: snapshot.circleId,
      circleName: snapshot.circle.name,
      userId: snapshot.userId,
      userName: snapshot.user?.displayName || snapshot.user?.name || "未設定",
      userImage: snapshot.user?.image || null,
      amount: snapshot.amount,
      snapshotDiff: snapshotDiff,
      note: snapshot.note,
      createdAt: snapshot.createdAt.toISOString(),
    },
  });
}
