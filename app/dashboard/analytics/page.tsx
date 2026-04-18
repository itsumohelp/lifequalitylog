"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

type CircleInfo = {
  id: string;
  name: string;
  role: string;
  currentBalance: number;
  postCount: number;
};

type CircleData = {
  balance: number;
  tags: string[];
  monthlyExpenses: { amount: number; tags: string[] }[];
  monthlyIncomeTotal: number;
  dailyExpenses: { date: string; amount: number; tags: string[] }[];
  dailyIncomes: { date: string; amount: number }[];
  dailySnapshots: { date: string; amount: number }[];
};

type MonthlyRow = {
  yearMonth: string;
  label: string;
  expense: number;
  income: number;
  net: number;
};

function formatYen(value: number) {
  const abs = Math.abs(value);
  if (abs >= 10000) return `¥${(abs / 10000).toFixed(1)}万`;
  return `¥${new Intl.NumberFormat("ja-JP").format(abs)}`;
}

function formatYenFull(value: number) {
  return `¥${new Intl.NumberFormat("ja-JP").format(Math.abs(value))}`;
}

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

// ---- タグ＆カレンダータブ ----
function CalendarTab({ circles }: { circles: CircleInfo[] }) {
  const [selectedCircleId, setSelectedCircleId] = useState<string>(
    circles[0]?.id ?? "",
  );
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [circleData, setCircleData] = useState<CircleData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!selectedCircleId) return;
    setIsLoading(true);
    setSelectedTags(new Set());
    fetch(
      `/api/analytics/circle?circleId=${encodeURIComponent(selectedCircleId)}`,
    )
      .then((r) => r.json())
      .then((data) => {
        setCircleData({
          balance: data.balance ?? 0,
          tags: data.tags ?? [],
          monthlyExpenses: data.monthlyExpenses ?? [],
          monthlyIncomeTotal: data.monthlyIncomeTotal ?? 0,
          dailyExpenses: data.dailyExpenses ?? [],
          dailyIncomes: data.dailyIncomes ?? [],
          dailySnapshots: data.dailySnapshots ?? [],
        });
      })
      .finally(() => setIsLoading(false));
  }, [selectedCircleId]);

  const filtered = useMemo(() => {
    if (!circleData) return null;
    const hasFilter = selectedTags.size > 0;
    const filterExp = (expenses: { amount: number; tags: string[] }[]) =>
      hasFilter
        ? expenses.filter((e) => e.tags.some((t) => selectedTags.has(t)))
        : expenses;

    const monthlyExp = filterExp(circleData.monthlyExpenses);
    const monthlyExpTotal = monthlyExp.reduce((s, e) => s + e.amount, 0);
    const dailyExp = filterExp(
      circleData.dailyExpenses as {
        amount: number;
        tags: string[];
        date: string;
      }[],
    );

    const dayMap = new Map<string, number>();
    for (const e of dailyExp) {
      dayMap.set(e.date, (dayMap.get(e.date) ?? 0) - e.amount);
    }
    if (!hasFilter) {
      for (const i of circleData.dailyIncomes) {
        dayMap.set(i.date, (dayMap.get(i.date) ?? 0) + i.amount);
      }
    }

    // 残高スナップショット（日付→最新額）
    const snapshotMap = new Map<string, number>();
    for (const s of circleData.dailySnapshots) {
      snapshotMap.set(s.date, s.amount);
    }

    return {
      monthlyExpTotal,
      monthlyIncomeTotal: circleData.monthlyIncomeTotal,
      balance: circleData.balance,
      dayMap,
      snapshotMap,
    };
  }, [circleData, selectedTags]);

  const calendarWeeks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    const startSunday = new Date(start);
    startSunday.setDate(start.getDate() - start.getDay());
    const weeks: (Date | null)[][] = [];
    const cursor = new Date(startSunday);
    while (cursor <= today) {
      const week: (Date | null)[] = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(cursor);
        week.push(day < start || day > today ? null : day);
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  }, []);

  const toDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return (
    <div className="space-y-4">
      {/* サークル選択 */}
      <div className="px-4">
        <div className="flex flex-wrap gap-2">
          {circles.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCircleId(c.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                selectedCircleId === c.id
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-600"
              }`}
            >
              {c.role === "ADMIN" && (
                <span className="mr-1 text-[10px] opacity-60">★</span>
              )}
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          読み込み中...
        </div>
      ) : filtered ? (
        <>
          {/* 月次サマリー */}
          <div className="px-4">
            <div className="text-[11px] text-slate-400 mb-2 font-medium">
              {new Date().getFullYear()}年{new Date().getMonth() + 1}月
              {selectedTags.size > 0 && (
                <span className="ml-1 text-sky-500">
                  {[...selectedTags].map((t) => `#${t}`).join(" ")}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
                <div className="text-[10px] text-slate-400 mb-1">支出</div>
                <div className="text-sm font-bold text-red-600">
                  -{formatYenFull(filtered.monthlyExpTotal)}
                </div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
                <div className="text-[10px] text-slate-400 mb-1">収入</div>
                <div className="text-sm font-bold text-emerald-600">
                  +{formatYenFull(filtered.monthlyIncomeTotal)}
                </div>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
                <div className="text-[10px] text-slate-400 mb-1">残高</div>
                <div
                  className={`text-sm font-bold ${filtered.balance >= 0 ? "text-emerald-600" : "text-red-600"}`}
                >
                  {filtered.balance >= 0 ? "" : "-"}
                  {formatYenFull(filtered.balance)}
                </div>
              </div>
            </div>
          </div>

          {/* タグフィルタ */}
          {circleData && circleData.tags.length > 0 && (
            <div className="px-4">
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedTags(new Set())}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    selectedTags.size === 0
                      ? "bg-slate-800 text-white"
                      : "bg-white border border-slate-200 text-slate-500"
                  }`}
                >
                  すべて
                </button>
                {circleData.tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSelectedTags((prev) => {
                        const next = new Set(prev);
                        next.has(tag) ? next.delete(tag) : next.add(tag);
                        return next;
                      });
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                      selectedTags.has(tag)
                        ? "bg-sky-500 text-white"
                        : "bg-white border border-slate-200 text-slate-500"
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* カレンダー */}
          <div className="px-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="grid grid-cols-7 border-b border-slate-100">
                {DAY_LABELS.map((label, i) => (
                  <div
                    key={label}
                    className={`text-center py-2 text-[11px] font-semibold ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-slate-400"}`}
                  >
                    {label}
                  </div>
                ))}
              </div>
              {calendarWeeks.map((week, wi) => (
                <div
                  key={wi}
                  className="grid grid-cols-7 border-b border-slate-50 last:border-0"
                >
                  {week.map((day, di) => {
                    if (!day)
                      return (
                        <div
                          key={di}
                          className="p-1 min-h-[56px] bg-slate-50/50"
                        />
                      );
                    const key = toDateKey(day);
                    const val = filtered.dayMap.get(key);
                    const snap = filtered.snapshotMap.get(key);
                    const isToday = key === toDateKey(new Date());
                    return (
                      <div
                        key={di}
                        className={`p-1 min-h-[72px] flex flex-col ${isToday ? "bg-slate-50" : ""}`}
                      >
                        <span
                          className={`text-[11px] font-medium mb-0.5 self-center w-5 h-5 flex items-center justify-center rounded-full ${
                            isToday
                              ? "bg-slate-900 text-white"
                              : di === 0
                                ? "text-red-400"
                                : di === 6
                                  ? "text-blue-400"
                                  : "text-slate-600"
                          }`}
                        >
                          {day.getDate()}
                        </span>
                        {val !== undefined && val !== 0 && (
                          <span
                            className={`text-[9px] font-medium leading-tight text-center ${val >= 0 ? "text-emerald-600" : "text-red-500"}`}
                          >
                            {val >= 0 ? "+" : ""}
                            {formatYen(val)}
                          </span>
                        )}
                        {snap !== undefined && (
                          <span className="text-[9px] text-slate-400 leading-tight text-center mt-0.5">
                            {formatYen(snap)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

// ---- 月次集計タブ ----
function MonthlyTab({ circles }: { circles: CircleInfo[] }) {
  const [selectedCircleId, setSelectedCircleId] = useState<string>(
    circles[0]?.id ?? "",
  );
  const [monthly, setMonthly] = useState<MonthlyRow[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!selectedCircleId) return;
    setIsLoading(true);
    fetch(
      `/api/analytics/circle-monthly?circleId=${encodeURIComponent(selectedCircleId)}`,
    )
      .then((r) => r.json())
      .then((data) => {
        setMonthly(data.monthly ?? []);
        setCurrentBalance(data.currentBalance ?? 0);
      })
      .finally(() => setIsLoading(false));
  }, [selectedCircleId]);

  const currentYM = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="space-y-4">
      {/* サークル選択 */}
      <div className="px-4">
        <div className="flex flex-wrap gap-2">
          {circles.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCircleId(c.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                selectedCircleId === c.id
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-600"
              }`}
            >
              {c.role === "ADMIN" && (
                <span className="mr-1 text-[10px] opacity-60">★</span>
              )}
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          読み込み中...
        </div>
      ) : (
        <div className="px-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* ヘッダー */}
            <div className="grid grid-cols-4 px-4 py-2.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400">
              <span>月</span>
              <span className="text-right">支出</span>
              <span className="text-right">収入</span>
              <span className="text-right">残高</span>
            </div>

            {/* 月別行 */}
            {[...monthly].reverse().map((row) => {
              const isCurrent = row.yearMonth === currentYM;
              return (
                <div
                  key={row.yearMonth}
                  className={`grid grid-cols-4 px-4 py-3 border-b border-slate-50 last:border-0 ${isCurrent ? "bg-slate-50" : ""}`}
                >
                  <span
                    className={`text-xs font-medium ${isCurrent ? "text-slate-900" : "text-slate-500"}`}
                  >
                    {row.label}
                    {isCurrent && (
                      <span className="ml-1 text-[9px] text-sky-500">今月</span>
                    )}
                  </span>
                  <span
                    className={`text-right text-xs font-medium ${row.expense > 0 ? "text-red-600" : "text-slate-300"}`}
                  >
                    {row.expense > 0 ? `-${formatYenFull(row.expense)}` : "—"}
                  </span>
                  <span
                    className={`text-right text-xs font-medium ${row.income > 0 ? "text-emerald-600" : "text-slate-300"}`}
                  >
                    {row.income > 0 ? `+${formatYenFull(row.income)}` : "—"}
                  </span>
                  <span
                    className={`text-right text-xs font-medium ${
                      isCurrent
                        ? currentBalance >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                        : "text-slate-300"
                    }`}
                  >
                    {isCurrent
                      ? `${currentBalance >= 0 ? "" : "-"}${formatYenFull(currentBalance)}`
                      : "—"}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 mt-2 px-1">
            ※ 残高は現在の残高を当月のみ表示
          </p>
        </div>
      )}
    </div>
  );
}

// ---- メインページ ----
export default function AnalyticsPage() {
  const [tab, setTab] = useState<"calendar" | "monthly">("calendar");
  const [circles, setCircles] = useState<CircleInfo[]>([]);
  const [isLoadingCircles, setIsLoadingCircles] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/circle")
      .then((r) => r.json())
      .then((data) => setCircles(data.circles ?? []))
      .finally(() => setIsLoadingCircles(false));
  }, []);

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="mx-auto max-w-lg pb-24">
        <div className="px-4 pt-6 pb-4">
          {/* タブ */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setTab("calendar")}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${
                tab === "calendar"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              当月の実績集計
            </button>
            <button
              onClick={() => setTab("monthly")}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${
                tab === "monthly"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              月次集計
            </button>
          </div>
        </div>

        {isLoadingCircles ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            読み込み中...
          </div>
        ) : circles.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            サークルがありません
          </div>
        ) : tab === "calendar" ? (
          <CalendarTab circles={circles} />
        ) : (
          <MonthlyTab circles={circles} />
        )}
      </div>

      <Link
        href="/dashboard"
        className="fixed bottom-6 left-6 z-40 flex items-center gap-1.5 rounded-full bg-slate-900/80 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-white shadow-lg active:scale-95 transition"
      >
        ← 戻る
      </Link>
    </div>
  );
}
