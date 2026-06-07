import prisma from "@/lib/prisma";
import { ALL_CATEGORY_TAGS } from "@/lib/tags";

const CATEGORY_LABELS: Record<string, string> = {
  FOOD: "食費",
  DAILY: "日用品",
  TRANSPORT: "交通費",
  ENTERTAINMENT: "娯楽",
  UTILITY: "光熱費",
  MEDICAL: "医療",
  OTHER: "その他",
};

const CATEGORY_COLORS: Record<string, string> = {
  FOOD: "#f59e0b",
  DAILY: "#10b981",
  TRANSPORT: "#3b82f6",
  ENTERTAINMENT: "#a855f7",
  UTILITY: "#f97316",
  MEDICAL: "#ef4444",
  OTHER: "#94a3b8",
};


function formatAmount(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}億`;
  if (n >= 10_000) return `¥${Math.round(n / 10_000)}万`;
  return `¥${n.toLocaleString()}`;
}

export default async function AnalysisPage() {
  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);

  // 直近6ヶ月のYYYYMM一覧
  const last6Months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(jstNow.getUTCFullYear(), jstNow.getUTCMonth() - i, 1);
    last6Months.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const [
    totalUsers,
    totalCircles,
    totalExpenses,
    totalIncomes,
    expenseAmountAgg,
    incomeAmountAgg,
    categoryGroups,
    monthlyGroups,
    monthlyIncomeRaw,
    recentForTagAmounts,
    goodReactionCount,
    hourlyRaw,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.circle.count(),
    prisma.expense.count(),
    prisma.income.count(),
    prisma.expense.aggregate({ _sum: { amount: true }, _avg: { amount: true } }),
    prisma.income.aggregate({ _sum: { amount: true } }),
    prisma.expense.groupBy({ by: ["category"], _sum: { amount: true } }),
    prisma.monthlySnapshot.groupBy({
      by: ["yearMonth"],
      where: { yearMonth: { in: last6Months } },
      _sum: { totalExpense: true },
    }),
    // 収入の月次集計（直近6ヶ月）
    prisma.$queryRawUnsafe<{ ym: string; total: bigint }[]>(
      `SELECT TO_CHAR("incomeDate" AT TIME ZONE 'Asia/Tokyo', 'YYYYMM') AS ym, SUM(amount) AS total FROM "Income" WHERE "incomeDate" >= NOW() - INTERVAL '6 months' GROUP BY ym`
    ),
    prisma.expense.findMany({
      select: { tags: true, amount: true },
      orderBy: { createdAt: "desc" },
      take: 2000,
    }),
    prisma.reaction.count({ where: { type: "GOOD" } }),
    // 投稿時間帯: JST換算で時刻別に集計
    prisma.$queryRawUnsafe<{ hour: number; count: bigint }[]>(
      `SELECT EXTRACT(HOUR FROM "createdAt" AT TIME ZONE 'Asia/Tokyo')::int AS hour, COUNT(*) AS count FROM "Expense" GROUP BY hour ORDER BY hour`
    ),
  ]);

  const totalPosts = totalExpenses + totalIncomes;
  const totalExpenseAmount = expenseAmountAgg._sum.amount ?? 0;
  const avgExpenseAmount = Math.round(expenseAmountAgg._avg.amount ?? 0);

  // カテゴリ別
  const totalAmount = categoryGroups.reduce((s, g) => s + (g._sum.amount ?? 0), 0);
  const categories = categoryGroups
    .map((g) => ({
      key: g.category,
      label: CATEGORY_LABELS[g.category] ?? g.category,
      amount: g._sum.amount ?? 0,
      pct: totalAmount > 0 ? Math.round(((g._sum.amount ?? 0) / totalAmount) * 100) : 0,
      color: CATEGORY_COLORS[g.category] ?? "#94a3b8",
    }))
    .sort((a, b) => b.amount - a.amount);

  // 月次推移
  const monthlyMap = new Map(monthlyGroups.map((m) => [m.yearMonth, m._sum.totalExpense ?? 0]));
  const monthlyIncomeMap = new Map(monthlyIncomeRaw.map((r) => [r.ym, Number(r.total)]));
  const monthlyTrend = last6Months.map((ym) => ({
    ym,
    label: `${parseInt(ym.slice(4))}月`,
    total: monthlyMap.get(ym) ?? 0,
    income: monthlyIncomeMap.get(ym) ?? 0,
  }));
  const maxMonthly = Math.max(...monthlyTrend.map((m) => Math.max(m.total, m.income)), 1);

  // 月次平均（データのある月のみ）
  const monthsWithExpense = monthlyTrend.filter((m) => m.total > 0);
  const monthsWithIncome = monthlyTrend.filter((m) => m.income > 0);
  const avgMonthlyExpense = monthsWithExpense.length > 0
    ? Math.round(monthsWithExpense.reduce((s, m) => s + m.total, 0) / monthsWithExpense.length)
    : 0;
  const avgMonthlyIncome = monthsWithIncome.length > 0
    ? Math.round(monthsWithIncome.reduce((s, m) => s + m.income, 0) / monthsWithIncome.length)
    : 0;

  // タグ別 平均金額・件数
  const templateTagSet = new Set<string>(ALL_CATEGORY_TAGS);
  const tagData = new Map<string, { sum: number; count: number }>();
  for (const e of recentForTagAmounts) {
    for (const tag of e.tags) {
      if (tag && templateTagSet.has(tag)) {
        const cur = tagData.get(tag) ?? { sum: 0, count: 0 };
        tagData.set(tag, { sum: cur.sum + e.amount, count: cur.count + 1 });
      }
    }
  }
  const topTagsByAvg = [...tagData.entries()]
    .map(([tag, { sum, count }]) => ({ tag, avg: Math.round(sum / count), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 16);

  // 投稿時間帯（0〜23時）
  const hourlyMap = new Map(hourlyRaw.map((r) => [r.hour, Number(r.count)]));
  const hourlyData = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count: hourlyMap.get(h) ?? 0,
  }));
  const maxHourly = Math.max(...hourlyData.map((h) => h.count), 1);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <div className="bg-slate-900 text-white px-4 py-10 text-center">
        <p className="text-xs text-slate-500 font-medium tracking-widest uppercase mb-2">CircleRun</p>
        <h1 className="text-xl font-bold mb-1">みんなのお金の動き</h1>
        <p className="text-slate-400 text-sm">家計サークルの集計データ</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* サマリーカード 1行目 */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "ユーザー数", value: totalUsers.toLocaleString(), unit: "人" },
            { label: "サークル数", value: totalCircles.toLocaleString(), unit: "サークル" },
            { label: "総投稿数", value: totalPosts.toLocaleString(), unit: "件" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{s.value}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{s.unit}</p>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* サマリーカード 2行目 */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "総支出額", value: formatAmount(totalExpenseAmount) },
            { label: "1件あたり平均", value: formatAmount(avgExpenseAmount) },
            { label: "👍 いいね数", value: goodReactionCount.toLocaleString() + "件" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
              <p className="text-sm font-bold text-slate-900 tabular-nums leading-tight mt-1">{s.value}</p>
              <p className="text-[11px] text-slate-500 mt-1.5 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* 月次平均 */}
        {(avgMonthlyExpense > 0 || avgMonthlyIncome > 0) && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-[10px] text-slate-400 mb-1">月平均 支出</p>
              <p className="text-xl font-bold text-red-500 tabular-nums">{formatAmount(avgMonthlyExpense)}</p>
              <p className="text-[10px] text-slate-400 mt-1">直近{monthsWithExpense.length}ヶ月の平均</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-[10px] text-slate-400 mb-1">月平均 収入</p>
              <p className="text-xl font-bold text-emerald-500 tabular-nums">{avgMonthlyIncome > 0 ? formatAmount(avgMonthlyIncome) : "—"}</p>
              <p className="text-[10px] text-slate-400 mt-1">直近{monthsWithIncome.length}ヶ月の平均</p>
            </div>
          </div>
        )}

        {/* カテゴリ別支出 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">カテゴリ別 支出割合</h2>
          {categories.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">データがまだありません</p>
          ) : (
            <div className="space-y-3">
              {categories.map((cat) => (
                <div key={cat.key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-xs text-slate-600">{cat.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">{formatAmount(cat.amount)}</span>
                      <span className="text-xs font-medium text-slate-700 w-8 text-right">{cat.pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${cat.pct}%`, backgroundColor: cat.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 月次推移（支出・収入） */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">月次 支出・収入推移</h2>
          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />支出</span>
            <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" />収入</span>
          </div>
          <div className="flex items-end gap-2" style={{ height: "100px" }}>
            {monthlyTrend.map((m) => {
              const expH = m.total > 0 ? Math.max(4, Math.round((m.total / maxMonthly) * 76)) : 0;
              const incH = m.income > 0 ? Math.max(4, Math.round((m.income / maxMonthly) * 76)) : 0;
              return (
                <div key={m.ym} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center gap-0.5" style={{ height: "76px" }}>
                    <div className="flex-1 rounded-t bg-red-400" style={{ height: `${expH}px` }} />
                    <div className="flex-1 rounded-t bg-emerald-400" style={{ height: `${incH}px` }} />
                  </div>
                  <span className="text-[10px] text-slate-500">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 投稿時間帯 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">投稿 時間帯</h2>
          <p className="text-[10px] text-slate-400 mb-3">何時ごろ投稿されているか（JST）</p>
          <div className="flex items-end gap-px" style={{ height: "72px" }}>
            {hourlyData.map((h) => {
              const barH = h.count > 0 ? Math.max(3, Math.round((h.count / maxHourly) * 56)) : 0;
              const isActive = h.count > 0;
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center" style={{ height: "72px" }}>
                  <div className="flex-1 w-full flex items-end">
                    <div
                      className="w-full rounded-sm"
                      style={{
                        height: `${barH}px`,
                        backgroundColor: isActive ? "#38bdf8" : "#f1f5f9",
                      }}
                    />
                  </div>
                  {h.hour % 6 === 0 && (
                    <span className="text-[8px] text-slate-400 mt-1">{h.hour}</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[9px] text-slate-400 mt-1 px-0.5">
            <span>深夜</span>
            <span>朝</span>
            <span>昼</span>
            <span>夜</span>
          </div>
        </div>

        {/* タグ別 平均金額 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">タグ別 平均支出</h2>
          <p className="text-[10px] text-slate-400 mb-3">タグごとの1件あたり平均金額（直近2,000件）</p>
          {topTagsByAvg.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">データがまだありません</p>
          ) : (
            <div className="space-y-2.5">
              {topTagsByAvg.map(({ tag, avg, count }, i) => {
                const maxAvg = topTagsByAvg[0].avg;
                const pct = maxAvg > 0 ? Math.round((avg / maxAvg) * 100) : 0;
                const opacity = Math.max(0.5, 1 - i * 0.04);
                return (
                  <div key={tag}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-700">{tag}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">{count}件</span>
                        <span className="text-xs font-medium text-slate-700">{formatAmount(avg)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: `rgba(14,165,233,${opacity})` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 注記 */}
        <p className="text-center text-[10px] text-slate-400 pb-2">
          個人が特定できない形式で集計しています。AIによる投稿を含みます。
        </p>
      </div>
    </div>
  );
}
