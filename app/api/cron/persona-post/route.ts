/**
 * POST /api/cron/persona-post
 * 5分ごとに実行するペルソナ投稿ジョブ。
 * Cloud Scheduler から Authorization: Bearer ${CRON_SECRET} で呼び出す。
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  shouldPostNow,
  generateExpense,
  getPersonaDef,
} from "@/lib/personaEngine";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // JST 現在時刻
  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const jstHour = jstNow.getUTCHours();

  // アクティブなペルソナを全取得
  const profiles = await prisma.personaProfile.findMany({
    where: { activatedAt: { lte: new Date() } },
    include: { user: { select: { id: true } } },
  });

  const posted: string[] = [];
  const skipped: string[] = [];

  for (const profile of profiles) {
    const def = getPersonaDef(profile.personaKey);
    if (!def) continue;

    if (!shouldPostNow(def, jstHour)) {
      skipped.push(def.key);
      continue;
    }

    const data = generateExpense(def, profile.circleId, profile.user.id);

    await prisma.$transaction(async (tx) => {
      const circle = await tx.circle.findUniqueOrThrow({
        where: { id: data.circleId },
        select: { currentBalance: true },
      });

      const balanceBefore = circle.currentBalance;
      const balanceAfter = balanceBefore - data.amount;

      // 支出を登録
      await tx.expense.create({
        data: {
          circleId: data.circleId,
          userId: data.userId,
          amount: data.amount,
          description: data.description,
          category: data.category,
          tags: data.tags,
          autoTags: [],
          expenseDate: data.expenseDate,
        },
      });

      // 残高を更新
      await tx.circle.update({
        where: { id: data.circleId },
        data: { currentBalance: balanceAfter },
      });

      // 残高変更ログ
      await tx.balanceTransaction.create({
        data: {
          circleId: data.circleId,
          userId: data.userId,
          type: "EXPENSE",
          isDelete: false,
          amount: data.amount,
          balanceBefore,
          balanceAfter,
        },
      });

      // 月次スナップショット更新
      const yearMonth = `${jstNow.getUTCFullYear()}${String(jstNow.getUTCMonth() + 1).padStart(2, "0")}`;
      await tx.monthlySnapshot.upsert({
        where: { circleId_yearMonth: { circleId: data.circleId, yearMonth } },
        update: {
          totalExpense: { increment: data.amount },
          expenseCount: { increment: 1 },
        },
        create: {
          circleId: data.circleId,
          yearMonth,
          totalExpense: data.amount,
          expenseCount: 1,
        },
      });
    });

    posted.push(def.key);
  }

  return NextResponse.json({ posted, skipped, jstHour });
}
