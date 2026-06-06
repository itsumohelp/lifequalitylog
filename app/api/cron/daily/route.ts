/**
 * POST /api/cron/daily
 * 毎日1回実行する日次ジョブ。
 * - 解禁日を迎えたペルソナを User / Circle / PersonaProfile として作成
 * - 給与日のペルソナに収入を登録
 * Cloud Scheduler から Authorization: Bearer ${CRON_SECRET} で呼び出す。
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PERSONAS } from "@/data/personas";
import { generateSalaryIncome, getPersonaDef } from "@/lib/personaEngine";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const launchDateStr = process.env.PERSONA_LAUNCH_DATE;
  const launchDate = launchDateStr ? new Date(launchDateStr) : (() => {
    const d = new Date();
    d.setDate(d.getDate() - 60);
    return d;
  })();

  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const jstToday = new Date(jstNow.toISOString().slice(0, 10)); // 日付のみ（YYYY-MM-DD）
  const daysSinceLaunch = Math.floor(
    (jstToday.getTime() - launchDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const jstDayOfMonth = jstNow.getUTCDate();

  const activated: string[] = [];
  const salaryPosted: string[] = [];

  // ──────────────────────────────────────────
  // 1. 新規ペルソナの活性化
  // ──────────────────────────────────────────
  for (const def of PERSONAS) {
    if (def.daysAfterLaunch > daysSinceLaunch) continue;

    // すでに存在する場合はスキップ
    const existing = await prisma.personaProfile.findUnique({
      where: { personaKey: def.key },
    });
    if (existing) continue;

    // パートナーのサークルが作成済みか確認
    let circleId: string | null = null;
    if (def.circlePartnerKey) {
      const partnerProfile = await prisma.personaProfile.findUnique({
        where: { personaKey: def.circlePartnerKey },
      });
      if (partnerProfile) circleId = partnerProfile.circleId;
    }

    await prisma.$transaction(async (tx) => {
      // Userを作成
      const user = await tx.user.create({
        data: {
          name: def.name,
          displayName: def.displayName,
          email: def.email,
          isAiPersona: true,
        },
      });

      // Circleを新規作成 or 既存に参加
      let circle: { id: string; currentBalance: number };
      if (circleId) {
        circle = await tx.circle.findUniqueOrThrow({
          where: { id: circleId },
          select: { id: true, currentBalance: true },
        });
      } else {
        circle = await tx.circle.create({
          data: {
            name: def.circleName,
            isPublic: true,
          },
        });
      }

      // CircleMemberを追加
      await tx.circleMember.create({
        data: {
          circleId: circle.id,
          userId: user.id,
          role: "ADMIN",
        },
      });

      // PersonaProfileを作成
      await tx.personaProfile.create({
        data: {
          userId: user.id,
          personaKey: def.key,
          circleId: circle.id,
          activatedAt: new Date(),
        },
      });
    });

    activated.push(def.key);
  }

  // ──────────────────────────────────────────
  // 2. 給与日処理
  // ──────────────────────────────────────────
  const salaryPersonas = PERSONAS.filter(
    (d) => d.salaryDay === jstDayOfMonth && d.salaryAmount,
  );

  for (const def of salaryPersonas) {
    const profile = await prisma.personaProfile.findUnique({
      where: { personaKey: def.key },
      include: { user: { select: { id: true } } },
    });
    if (!profile) continue;

    const income = generateSalaryIncome(def, profile.circleId, profile.user.id);
    if (!income) continue;

    await prisma.$transaction(async (tx) => {
      const circle = await tx.circle.findUniqueOrThrow({
        where: { id: income.circleId },
        select: { currentBalance: true },
      });

      const balanceBefore = circle.currentBalance;
      const balanceAfter = balanceBefore + income.amount;

      await tx.income.create({
        data: {
          circleId: income.circleId,
          userId: income.userId,
          amount: income.amount,
          description: income.description,
          category: income.category,
          tags: income.tags,
          autoTags: [],
          incomeDate: income.incomeDate,
        },
      });

      await tx.circle.update({
        where: { id: income.circleId },
        data: { currentBalance: balanceAfter },
      });

      await tx.balanceTransaction.create({
        data: {
          circleId: income.circleId,
          userId: income.userId,
          type: "INCOME",
          isDelete: false,
          amount: income.amount,
          balanceBefore,
          balanceAfter,
        },
      });

      const yearMonth = `${jstNow.getUTCFullYear()}${String(jstNow.getUTCMonth() + 1).padStart(2, "0")}`;
      await tx.monthlySnapshot.upsert({
        where: { circleId_yearMonth: { circleId: income.circleId, yearMonth } },
        update: {
          totalExpense: { increment: 0 },
        },
        create: {
          circleId: income.circleId,
          yearMonth,
        },
      });
    });

    salaryPosted.push(def.key);
  }

  return NextResponse.json({ activated, salaryPosted, daysSinceLaunch });
}
