import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ExpenseCategory, IncomeCategory } from "@/app/generated/prisma/enums";

type SampleExpense = {
  daysAgo: number;
  amount: number;
  description: string;
  category: ExpenseCategory;
  tags: string[];
};

type SampleIncome = {
  daysAgo: number;
  amount: number;
  description: string;
  category: IncomeCategory;
  tags: string[];
};

const SAMPLE_EXPENSES: SampleExpense[] = [
  { daysAgo: 0,  amount: 650,   description: "コンビニ",    category: "FOOD",          tags: ["食費", "コンビニ"] },
  { daysAgo: 1,  amount: 1200,  description: "ランチ",      category: "FOOD",          tags: ["食費"] },
  { daysAgo: 1,  amount: 800,   description: "電車代",      category: "TRANSPORT",     tags: ["交通費"] },
  { daysAgo: 2,  amount: 3200,  description: "スーパー",    category: "FOOD",          tags: ["食費", "買い物"] },
  { daysAgo: 3,  amount: 1500,  description: "カフェ",      category: "FOOD",          tags: ["食費", "カフェ"] },
  { daysAgo: 4,  amount: 5800,  description: "洋服",        category: "DAILY",         tags: ["ショッピング"] },
  { daysAgo: 5,  amount: 1000,  description: "ランチ",      category: "FOOD",          tags: ["食費"] },
  { daysAgo: 6,  amount: 350,   description: "コンビニ",    category: "FOOD",          tags: ["食費", "コンビニ"] },
  { daysAgo: 7,  amount: 2400,  description: "居酒屋",      category: "ENTERTAINMENT", tags: ["娯楽", "外食"] },
  { daysAgo: 8,  amount: 1600,  description: "外食",        category: "FOOD",          tags: ["食費", "外食"] },
  { daysAgo: 9,  amount: 600,   description: "バス代",      category: "TRANSPORT",     tags: ["交通費"] },
  { daysAgo: 10, amount: 7800,  description: "電気代",      category: "UTILITY",       tags: ["光熱費", "電気"] },
  { daysAgo: 11, amount: 1200,  description: "ランチ",      category: "FOOD",          tags: ["食費"] },
  { daysAgo: 12, amount: 3500,  description: "日用品",      category: "DAILY",         tags: ["日用品"] },
  { daysAgo: 13, amount: 700,   description: "コーヒー",    category: "FOOD",          tags: ["食費", "カフェ"] },
  { daysAgo: 14, amount: 1500,  description: "電車代",      category: "TRANSPORT",     tags: ["交通費"] },
  { daysAgo: 15, amount: 2200,  description: "外食",        category: "FOOD",          tags: ["食費", "外食"] },
  { daysAgo: 16, amount: 4800,  description: "美容院",      category: "DAILY",         tags: ["美容"] },
  { daysAgo: 17, amount: 900,   description: "コンビニ",    category: "FOOD",          tags: ["食費", "コンビニ"] },
  { daysAgo: 18, amount: 5500,  description: "ガス代",      category: "UTILITY",       tags: ["光熱費", "ガス"] },
  { daysAgo: 19, amount: 1100,  description: "ランチ",      category: "FOOD",          tags: ["食費"] },
  { daysAgo: 20, amount: 2200,  description: "映画",        category: "ENTERTAINMENT", tags: ["娯楽"] },
  { daysAgo: 21, amount: 800,   description: "電車代",      category: "TRANSPORT",     tags: ["交通費"] },
  { daysAgo: 22, amount: 3800,  description: "スーパー",    category: "FOOD",          tags: ["食費", "買い物"] },
  { daysAgo: 23, amount: 600,   description: "コンビニ",    category: "FOOD",          tags: ["食費", "コンビニ"] },
  { daysAgo: 24, amount: 1800,  description: "飲み会",      category: "ENTERTAINMENT", tags: ["娯楽"] },
  { daysAgo: 25, amount: 1300,  description: "ランチ",      category: "FOOD",          tags: ["食費"] },
  { daysAgo: 26, amount: 7200,  description: "水道代",      category: "UTILITY",       tags: ["光熱費", "水道"] },
  { daysAgo: 27, amount: 2600,  description: "本・雑誌",    category: "OTHER",         tags: ["勉強"] },
  { daysAgo: 28, amount: 450,   description: "コンビニ",    category: "FOOD",          tags: ["食費", "コンビニ"] },
];

const SAMPLE_INCOMES: SampleIncome[] = [
  { daysAgo: 5,  amount: 280000, description: "給料",     category: "SALARY", tags: ["給料"] },
  { daysAgo: 20, amount: 45000,  description: "副業収入", category: "OTHER",  tags: ["副業"] },
];

function dateAgo(daysAgo: number): Date {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { circleId } = await request.json();
  if (!circleId) {
    return NextResponse.json({ error: "circleId is required" }, { status: 400 });
  }

  const member = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId, userId } },
  });
  if (!member || member.role !== "ADMIN") {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  // 既にデータがある場合は重複生成しない
  const existingCount = await prisma.expense.count({ where: { circleId } });
  if (existingCount >= 5) {
    return NextResponse.json({ error: "すでにデータがあります" }, { status: 409 });
  }

  // 支出を一括登録
  await prisma.expense.createMany({
    data: SAMPLE_EXPENSES.map((e) => {
      const d = dateAgo(e.daysAgo);
      return {
        circleId,
        userId,
        amount: e.amount,
        description: e.description,
        category: e.category,
        tags: e.tags,
        autoTags: [],
        expenseDate: d,
        createdAt: d,
      };
    }),
  });

  // 収入を一括登録
  await prisma.income.createMany({
    data: SAMPLE_INCOMES.map((i) => {
      const d = dateAgo(i.daysAgo);
      return {
        circleId,
        userId,
        amount: i.amount,
        description: i.description,
        category: i.category,
        tags: i.tags,
        autoTags: [],
        incomeDate: d,
        createdAt: d,
      };
    }),
  });

  // サークル残高を更新
  const totalExpense = SAMPLE_EXPENSES.reduce((s, e) => s + e.amount, 0);
  const totalIncome = SAMPLE_INCOMES.reduce((s, i) => s + i.amount, 0);
  await prisma.circle.update({
    where: { id: circleId },
    data: { currentBalance: { increment: totalIncome - totalExpense } },
  });

  return NextResponse.json({ ok: true });
}
