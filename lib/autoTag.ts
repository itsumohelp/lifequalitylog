import prisma from "@/lib/prisma";

const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

// 10円未満の端数がある金額は固有性が高いとみなす（500, 1000等の汎用数字を除外）
const isSpecificAmount = (amount: number) => amount % 10 !== 0;

function extractTags(
  matches: { tags: string[] }[],
  minMatches: number,
): string[] {
  if (matches.length < minMatches) return [];

  const tagCounts = new Map<string, number>();
  for (const e of matches) {
    for (const tag of e.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  return [...tagCounts.entries()]
    .filter(([, count]) => count >= minMatches)
    .map(([tag]) => tag)
    .sort();
}

/**
 * ルールベースの自動タグ付け（フォールバック方式）
 *
 * 以下の順に試し、タグが得られた時点で返す。
 *
 * 0. 平日/休日 + 金額完全一致（端数あり限定）+ 過去40日 (2件以上)
 * 1. 平日/休日 + 金額±50% + 時間帯±4時間 + 過去40日 (2件以上)
 * 2. 平日/休日 + 金額±50%              + 過去40日 (2件以上)
 * 3. 平日/休日 +               時間帯±4時間 + 過去40日 (2件以上)
 */
export async function computeAutoTags(
  circleId: string,
  amount: number,
  date: Date,
): Promise<string[]> {
  const lookbackFrom = new Date(date);
  lookbackFrom.setDate(lookbackFrom.getDate() - 40);

  const pastExpenses = await prisma.expense.findMany({
    where: {
      circleId,
      expenseDate: { gte: lookbackFrom, lt: date },
    },
    select: { amount: true, tags: true, expenseDate: true },
  });

  const tagged = pastExpenses.filter((e) => e.tags.length > 0);

  const hour = date.getHours();
  const weekend = isWeekend(date);
  const amountMin = amount * 0.5;
  const amountMax = amount * 1.5;

  const matchesWeekend = (e: { expenseDate: Date }) =>
    isWeekend(new Date(e.expenseDate)) === weekend;
  const matchesAmount = (e: { amount: number }) =>
    e.amount >= amountMin && e.amount <= amountMax;
  const matchesHour = (e: { expenseDate: Date }) =>
    Math.abs(new Date(e.expenseDate).getHours() - hour) <= 4;

  // 0. 平日/休日 + 金額完全一致（端数あり限定）
  if (isSpecificAmount(amount)) {
    const pass0 = tagged.filter(
      (e) => matchesWeekend(e) && e.amount === amount,
    );
    const tags0 = extractTags(pass0, 2);
    if (tags0.length > 0) return tags0;
  }

  // 1. 平日/休日 + 金額 + 時間帯
  const pass1 = tagged.filter(
    (e) => matchesWeekend(e) && matchesAmount(e) && matchesHour(e),
  );
  const tags1 = extractTags(pass1, 2);
  if (tags1.length > 0) return tags1;

  // 2. 平日/休日 + 金額
  const pass2 = tagged.filter((e) => matchesWeekend(e) && matchesAmount(e));
  const tags2 = extractTags(pass2, 2);
  if (tags2.length > 0) return tags2;

  // 3. 平日/休日 + 時間帯
  const pass3 = tagged.filter((e) => matchesWeekend(e) && matchesHour(e));
  return extractTags(pass3, 2);
}

export async function computeAutoTagsForIncome(
  circleId: string,
  amount: number,
  date: Date,
): Promise<string[]> {
  const lookbackFrom = new Date(date);
  lookbackFrom.setDate(lookbackFrom.getDate() - 40);

  const pastIncomes = await prisma.income.findMany({
    where: {
      circleId,
      incomeDate: { gte: lookbackFrom, lt: date },
    },
    select: { amount: true, tags: true, incomeDate: true },
  });

  const tagged = pastIncomes.filter((i) => i.tags.length > 0);

  const hour = date.getHours();
  const weekend = isWeekend(date);
  const amountMin = amount * 0.5;
  const amountMax = amount * 1.5;

  const matchesWeekend = (e: { incomeDate: Date }) =>
    isWeekend(new Date(e.incomeDate)) === weekend;
  const matchesAmount = (e: { amount: number }) =>
    e.amount >= amountMin && e.amount <= amountMax;
  const matchesHour = (e: { incomeDate: Date }) =>
    Math.abs(new Date(e.incomeDate).getHours() - hour) <= 4;

  // 0. 平日/休日 + 金額完全一致（端数あり限定）
  if (isSpecificAmount(amount)) {
    const pass0 = tagged.filter(
      (e) => matchesWeekend(e) && e.amount === amount,
    );
    const tags0 = extractTags(pass0, 2);
    if (tags0.length > 0) return tags0;
  }

  // 1. 平日/休日 + 金額 + 時間帯
  const pass1 = tagged.filter(
    (e) => matchesWeekend(e) && matchesAmount(e) && matchesHour(e),
  );
  const tags1 = extractTags(pass1, 2);
  if (tags1.length > 0) return tags1;

  // 2. 平日/休日 + 金額
  const pass2 = tagged.filter((e) => matchesWeekend(e) && matchesAmount(e));
  const tags2 = extractTags(pass2, 2);
  if (tags2.length > 0) return tags2;

  // 3. 平日/休日 + 時間帯
  const pass3 = tagged.filter((e) => matchesWeekend(e) && matchesHour(e));
  return extractTags(pass3, 2);
}
