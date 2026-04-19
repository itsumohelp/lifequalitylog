import prisma from "@/lib/prisma";

const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

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

  const threshold = Math.ceil(matches.length * 0.6);
  return [...tagCounts.entries()]
    .filter(([, count]) => count >= threshold)
    .map(([tag]) => tag)
    .sort();
}

/**
 * ルールベースの自動タグ付け（フォールバック方式）
 *
 * 以下の順に試し、タグが得られた時点で返す。
 *
 * 1. 平日/休日 + 金額±20% + 時間帯±1時間 + 過去90日 (2件以上)
 * 2. 平日/休日 + 金額±20%              + 過去90日 (2件以上)
 * 3. 平日/休日 +               時間帯±1時間 + 過去90日 (2件以上)
 */
export async function computeAutoTags(
  circleId: string,
  amount: number,
  date: Date,
): Promise<string[]> {
  const ninetyDaysAgo = new Date(date);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const pastExpenses = await prisma.expense.findMany({
    where: {
      circleId,
      expenseDate: { gte: ninetyDaysAgo, lt: date },
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
