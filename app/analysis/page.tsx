import prisma from "@/lib/prisma";

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
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}万`;
  return `${n.toLocaleString()}`;
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
    categoryGroups,
    monthlyGroups,
    recentForTags,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.circle.count(),
    prisma.expense.count(),
    prisma.income.count(),
    prisma.expense.groupBy({
      by: ["category"],
      _sum: { amount: true },
    }),
    prisma.monthlySnapshot.groupBy({
      by: ["yearMonth"],
      where: { yearMonth: { in: last6Months } },
      _sum: { totalExpense: true },
    }),
    prisma.expense.findMany({
      select: { tags: true },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
  ]);

  const totalPosts = totalExpenses + totalIncomes;

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
  const monthlyTrend = last6Months.map((ym) => ({
    ym,
    label: `${parseInt(ym.slice(4))}月`,
    total: monthlyMap.get(ym) ?? 0,
  }));
  const maxMonthly = Math.max(...monthlyTrend.map((m) => m.total), 1);

  // タグ集計
  const tagCounts = new Map<string, number>();
  for (const e of recentForTags) {
    for (const tag of e.tags) {
      if (tag) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 16);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <div className="bg-slate-900 text-white px-4 py-10 text-center">
        <p className="text-xs text-slate-500 font-medium tracking-widest uppercase mb-2">CircleRun</p>
        <h1 className="text-xl font-bold mb-1">みんなのお金の動き</h1>
        <p className="text-slate-400 text-sm">家計サークルの集計データ</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* サマリーカード */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "ユーザー数", value: totalUsers, unit: "人" },
            { label: "サークル数", value: totalCircles, unit: "サークル" },
            { label: "総投稿数", value: totalPosts, unit: "件" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {s.value.toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">{s.unit}</p>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

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
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-xs text-slate-600">{cat.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">¥{formatAmount(cat.amount)}</span>
                      <span className="text-xs font-medium text-slate-700 w-8 text-right">{cat.pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${cat.pct}%`, backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 月次支出推移 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">月次 支出推移</h2>
          <div className="flex items-end gap-2" style={{ height: "100px" }}>
            {monthlyTrend.map((m) => {
              const barH = maxMonthly > 0 ? Math.max(m.total > 0 ? 6 : 0, Math.round((m.total / maxMonthly) * 80)) : 0;
              return (
                <div key={m.ym} className="flex-1 flex flex-col items-center gap-1">
                  {m.total > 0 && (
                    <span className="text-[9px] text-slate-400 leading-none">
                      ¥{formatAmount(m.total)}
                    </span>
                  )}
                  <div className="w-full flex items-end" style={{ height: "80px" }}>
                    <div
                      className="w-full rounded-t bg-sky-400"
                      style={{ height: `${barH}px` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* よく使われるタグ */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">よく使われるタグ</h2>
          {topTags.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">データがまだありません</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {topTags.map(([tag, count], i) => {
                // 上位ほど濃い色
                const opacity = Math.max(0.4, 1 - i * 0.04);
                return (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border"
                    style={{
                      backgroundColor: `rgba(14,165,233,${opacity * 0.15})`,
                      borderColor: `rgba(14,165,233,${opacity * 0.4})`,
                      color: `rgba(2,132,199,${Math.min(1, opacity + 0.2)})`,
                    }}
                  >
                    {tag}
                    <span className="text-[10px] opacity-70">{count}</span>
                  </span>
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
