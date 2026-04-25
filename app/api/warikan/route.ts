import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const circleId = searchParams.get("circleId");
  const period = searchParams.get("period") ?? "month";

  if (!circleId) {
    return NextResponse.json({ error: "circleId is required" }, { status: 400 });
  }

  const membership = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId, userId: session.user.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // 期間計算（JST基準）
  const now = new Date();
  let gte: Date | undefined;
  if (period === "month") {
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    gte = new Date(`${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}-01T00:00:00+09:00`);
  } else if (period === "30") {
    gte = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (period === "90") {
    gte = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  }

  const [members, expenses] = await Promise.all([
    prisma.circleMember.findMany({
      where: { circleId },
      include: {
        user: { select: { id: true, name: true, displayName: true, image: true } },
      },
    }),
    prisma.expense.findMany({
      where: { circleId, ...(gte ? { createdAt: { gte } } : {}) },
      select: { userId: true, amount: true },
    }),
  ]);

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  // メンバーごとの支払い集計
  const paidMap = new Map<string, number>();
  for (const e of expenses) {
    paidMap.set(e.userId, (paidMap.get(e.userId) ?? 0) + e.amount);
  }

  const memberData = members.map((m) => ({
    userId: m.user.id,
    name: m.user.displayName || m.user.name || "未設定",
    image: m.user.image,
    paid: paidMap.get(m.user.id) ?? 0,
  }));

  return NextResponse.json({ total, members: memberData });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { circleId, message } = await req.json();
  if (!circleId || !message) {
    return NextResponse.json({ error: "circleId and message are required" }, { status: 400 });
  }

  const membership = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId, userId: session.user.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const notification = await prisma.notification.create({
    data: {
      circleId,
      type: "WARIKAN_RESULT",
      actorUserId: session.user.id,
      message,
    },
    include: {
      circle: { select: { name: true } },
      actor: { select: { id: true, name: true, displayName: true, image: true } },
    },
  });

  return NextResponse.json({ notification }, { status: 201 });
}
