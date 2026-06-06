"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TrophyDef, TrophyDifficulty } from "@/lib/trophies";

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

type TrophyWithState = TrophyDef & { earned: boolean; earnedAt: string | null };

type ProfileData = {
  stats: {
    daysSinceJoined: number;
    postCount: number;
    uniqueTagCount: number;
    reactionCount: number;
    currentStreak: number;
    totalAmount: number;
  };
  trophies: TrophyWithState[];
  newlyEarned: string[];
};

// ──────────────────────────────────────────
// Trophy Card
// ──────────────────────────────────────────

const difficultyLabel: Record<TrophyDifficulty, string> = {
  low: "LOW", medium: "MID", high: "HIGH",
};
const difficultyBorder: Record<TrophyDifficulty, string> = {
  low:    "border-emerald-200",
  medium: "border-sky-200",
  high:   "border-amber-300",
};
const difficultyBg: Record<TrophyDifficulty, string> = {
  low:    "bg-emerald-50",
  medium: "bg-sky-50",
  high:   "bg-amber-50",
};
const difficultyGlow: Record<TrophyDifficulty, string> = {
  low:    "shadow-emerald-100",
  medium: "shadow-sky-100",
  high:   "shadow-amber-200",
};
const difficultyBadge: Record<TrophyDifficulty, string> = {
  low:    "bg-emerald-100 text-emerald-700",
  medium: "bg-sky-100 text-sky-700",
  high:   "bg-amber-100 text-amber-700",
};

function TrophyCard({ trophy }: { trophy: TrophyWithState }) {
  const d = trophy.difficulty;
  if (!trophy.earned) {
    return (
      <div className="flex flex-col items-center gap-1 p-3 rounded-2xl border border-slate-100 bg-slate-50 opacity-40">
        <span className="text-2xl grayscale">{trophy.icon}</span>
        <div className="text-[11px] font-medium text-slate-400 text-center leading-tight">{trophy.name}</div>
      </div>
    );
  }
  return (
    <div
      className={`flex flex-col items-center gap-1 p-3 rounded-2xl border ${difficultyBorder[d]} ${difficultyBg[d]} shadow-md ${difficultyGlow[d]}`}
    >
      <span className="text-2xl">{trophy.icon}</span>
      <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${difficultyBadge[d]}`}>
        {difficultyLabel[d]}
      </div>
      <div className="text-[11px] font-medium text-slate-700 text-center leading-tight">{trophy.name}</div>
      <div className="text-[9px] text-slate-400 text-center leading-tight">{trophy.description}</div>
    </div>
  );
}

// ──────────────────────────────────────────
// Stat Card
// ──────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col gap-1">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
    </div>
  );
}

// ──────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────

type FilterTab = "all" | "low" | "medium" | "high";

export default function ProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setApiError(`エラー ${res.status}: ${body.detail ?? body.error ?? "不明なエラー"}`);
          setLoading(false);
          return;
        }
        const d: ProfileData = await res.json();
        setData(d);
        setLoading(false);
      } catch (e) {
        setApiError(`通信エラー: ${String(e)}`);
        setLoading(false);
      }
    })();
  }, []);

  const filtered = data?.trophies.filter(
    (t) => filter === "all" || t.difficulty === filter,
  ) ?? [];

  const earnedCount = data?.trophies.filter((t) => t.earned).length ?? 0;
  const totalCount = data?.trophies.length ?? 0;

  if (loading) {
    return (
      <div className="min-h-dvh bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">読み込み中...</div>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="min-h-dvh bg-slate-50 flex flex-col items-center justify-center gap-3 px-6">
        <div className="text-slate-500 text-sm text-center">{apiError}</div>
        <Link href="/dashboard" className="text-sm text-sky-600 underline">ダッシュボードへ戻る</Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-dvh bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="text-slate-400 text-sm">ログインが必要です</div>
        <Link href="/dashboard" className="text-sm text-sky-600 underline">ログインページへ</Link>
      </div>
    );
  }

  const { stats } = data;

  return (
    <div className="min-h-dvh bg-slate-50 pb-24">
      <div className="max-w-md mx-auto px-4 pt-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-900">マイ記録</h1>
          <Link
            href="/dashboard"
            className="text-sm text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg"
          >
            ← 戻る
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard
            label="参加日数"
            value={`${stats.daysSinceJoined}日`}
            sub="最初の投稿から"
          />
          <StatCard
            label="投稿数"
            value={`${stats.postCount}件`}
            sub="累計支出記録"
          />
          <StatCard
            label="使用タグ数"
            value={`${stats.uniqueTagCount}種類`}
            sub="ユニークタグ数"
          />
          <StatCard
            label="もらったいいね"
            value={`${stats.reactionCount}個`}
            sub={stats.currentStreak > 0 ? `連続${stats.currentStreak}日継続中` : "継続ゼロ日"}
          />
        </div>

        {/* Trophy header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-900">トロフィー</h2>
          <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-full">
            {earnedCount} / {totalCount} 獲得
          </span>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {(["all", "low", "medium", "high"] as FilterTab[]).map((tab) => {
            const labels: Record<FilterTab, string> = {
              all: "すべて",
              low: "LOW",
              medium: "MID",
              high: "HIGH",
            };
            const colors: Record<FilterTab, string> = {
              all: "bg-slate-900 text-white",
              low: "bg-emerald-600 text-white",
              medium: "bg-sky-600 text-white",
              high: "bg-amber-500 text-white",
            };
            const inactive =
              "bg-white text-slate-500 border border-slate-200";
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
                  filter === tab ? colors[tab] : inactive
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* Trophy grid */}
        <div className="grid grid-cols-3 gap-3">
          {filtered.map((t) => (
            <TrophyCard key={t.key} trophy={t} />
          ))}
        </div>
      </div>

    </div>
  );
}
