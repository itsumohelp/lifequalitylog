"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type Period = "daily" | "weekly" | "monthly";
type ViewType = "total" | "circle" | "tag";

type Circle = {
  id: string;
  name: string;
};

type DataPoint = {
  date: string;
  [key: string]: string | number;
};

const COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
];

function formatYen(value: number) {
  return new Intl.NumberFormat("ja-JP").format(value);
}

function formatDateLabel(date: string, period: Period) {
  if (period === "monthly") {
    const [year, month] = date.split("-");
    return `${month}月`;
  } else if (period === "weekly") {
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}週`;
  } else {
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
}

// カスタムツールチップ
function CustomTooltip({
  active,
  payload,
  label,
  period,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  period: Period;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-2 text-xs">
      <p className="font-medium text-slate-700 mb-1">
        {label ? formatDateLabel(label, period) : ""}
      </p>
      {payload.map((entry, index) => (
        <p key={index} style={{ color: entry.color }} className="flex justify-between gap-4">
          <span>{entry.name === "balance" ? "残高" : entry.name}:</span>
          <span className="font-medium">¥{formatYen(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("daily");
  const [viewType, setViewType] = useState<ViewType>("total");
  const [selectedCircleId, setSelectedCircleId] = useState<string>("");
  const [data, setData] = useState<DataPoint[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lineKeys, setLineKeys] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          period,
          viewType,
        });
        if (selectedCircleId) {
          params.set("circleId", selectedCircleId);
        }

        const res = await fetch(`/api/analytics?${params}`);
        const json = await res.json();

        setData(json.data || []);
        setCircles(json.circles || []);
        setTags(json.tags || []);

        // グラフの線のキーを抽出
        if (json.data && json.data.length > 0) {
          const keys = Object.keys(json.data[0]).filter((k) => k !== "date");
          setLineKeys(keys);
        } else {
          setLineKeys([]);
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [period, viewType, selectedCircleId]);

  // viewTypeがtagの場合、サークル選択が必須
  useEffect(() => {
    if (viewType === "tag" && !selectedCircleId && circles.length > 0) {
      setSelectedCircleId(circles[0].id);
    }
  }, [viewType, circles, selectedCircleId]);

  return (
    <div className="min-h-dvh bg-white">
      <div className="mx-auto max-w-2xl px-4 py-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/dashboard"
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← 戻る
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">集計</h1>
          <div className="w-12" />
        </div>

        {/* フィルター */}
        <div className="space-y-3 mb-6">
          {/* 表示タイプ選択 */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewType("total")}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition ${
                viewType === "total"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              全体
            </button>
            <button
              onClick={() => setViewType("circle")}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition ${
                viewType === "circle"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              サークル別
            </button>
            <button
              onClick={() => setViewType("tag")}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition ${
                viewType === "tag"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              タグ別
            </button>
          </div>

          {/* 期間選択 */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setPeriod("daily")}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition ${
                period === "daily"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              日次
            </button>
            <button
              onClick={() => setPeriod("weekly")}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition ${
                period === "weekly"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              週次
            </button>
            <button
              onClick={() => setPeriod("monthly")}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition ${
                period === "monthly"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              月次
            </button>
          </div>

          {/* サークル選択（タグ別の場合は必須） */}
          {(viewType === "tag" || viewType === "circle") && (
            <select
              value={selectedCircleId}
              onChange={(e) => setSelectedCircleId(e.target.value)}
              className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400"
            >
              {viewType === "circle" && (
                <option value="">すべてのサークル</option>
              )}
              {circles.map((circle) => (
                <option key={circle.id} value={circle.id}>
                  {circle.name || "（名前なし）"}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* グラフ */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="text-sm font-medium text-slate-700 mb-4">
            {viewType === "total"
              ? "全体の残高推移"
              : viewType === "circle"
                ? "サークル別残高推移"
                : "タグ別支出推移"}
          </h2>

          {isLoading ? (
            <div className="h-64 flex items-center justify-center text-slate-500">
              読み込み中...
            </div>
          ) : data.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500">
              データがありません
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={data}
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickFormatter={(value) => formatDateLabel(value, period)}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickFormatter={(value) => `¥${formatYen(value)}`}
                  width={70}
                />
                <Tooltip content={<CustomTooltip period={period} />} />
                {lineKeys.length > 1 && (
                  <Legend
                    wrapperStyle={{ fontSize: 10 }}
                    iconSize={8}
                  />
                )}
                {lineKeys.map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={key === "balance" ? "残高" : key}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 凡例（タグ別の場合） */}
        {viewType === "tag" && tags.length > 0 && (
          <div className="mt-4 p-3 bg-slate-50 rounded-lg">
            <h3 className="text-xs font-medium text-slate-600 mb-2">
              使用されているタグ
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag, index) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${COLORS[index % COLORS.length]}20`,
                    color: COLORS[index % COLORS.length],
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
