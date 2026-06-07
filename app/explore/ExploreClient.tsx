"use client";

import { useState } from "react";
import Link from "next/link";

export type CircleCard = {
  id: string;
  name: string;
  memberCount: number;
  monthlyExpense: number;
  monthlyPostCount: number;
  topTags: string[];
  segmentKey: string;
  segmentLabel: string;
  segmentEmoji: string;
};

const SEGMENTS = [
  { key: "all",    label: "すべて",      emoji: "🏦" },
  { key: "family", label: "ファミリー",  emoji: "👨‍👩‍👧" },
  { key: "couple", label: "カップル",    emoji: "💑" },
  { key: "solo",   label: "一人暮らし",  emoji: "🏠" },
  { key: "frugal", label: "節約家計",    emoji: "🌱" },
  { key: "leisure",label: "レジャー派",  emoji: "✈️" },
];

function formatYen(n: number) {
  return new Intl.NumberFormat("ja-JP").format(n);
}

export default function ExploreClient({ circles }: { circles: CircleCard[] }) {
  const [segment, setSegment] = useState("all");

  const filtered = segment === "all"
    ? circles
    : circles.filter((c) => c.segmentKey === segment);

  return (
    <div className="min-h-dvh bg-slate-50 pb-16">
      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* タイトル */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">みんなの家計</h1>
          <p className="text-sm text-slate-500 mt-1">
            公開中のサークルを支出パターンで探してみよう
          </p>
        </div>

        {/* セグメントフィルター */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
          {SEGMENTS.map((s) => {
            const count = s.key === "all" ? circles.length : circles.filter((c) => c.segmentKey === s.key).length;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSegment(s.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition ${
                  segment === s.key
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200 text-slate-600"
                }`}
              >
                <span>{s.emoji}</span>
                <span>{s.label}</span>
                <span className={`text-[10px] px-1 rounded-full ${segment === s.key ? "bg-white/20" : "bg-slate-100 text-slate-400"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* サークル一覧 */}
        {filtered.length === 0 ? (
          <div className="text-center text-slate-400 text-sm mt-16">
            <p className="text-3xl mb-3">🔍</p>
            <p>このカテゴリの公開サークルはまだありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => (
              <Link
                key={c.id}
                href={`/c/${c.id}`}
                className="block bg-white rounded-2xl border border-slate-100 p-4 hover:border-slate-300 active:scale-[0.99] transition shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-base font-semibold text-slate-900 truncate">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {c.segmentEmoji} {c.segmentLabel}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        👤 {c.memberCount}人
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold text-red-500">
                      ¥{formatYen(c.monthlyExpense)}
                    </div>
                    <div className="text-[10px] text-slate-400">今月の支出</div>
                  </div>
                </div>

                {/* タグ */}
                {c.topTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {c.topTags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 border border-sky-100"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* 投稿数バー */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-1 bg-emerald-400 rounded-full"
                      style={{ width: `${Math.min(100, (c.monthlyPostCount / 30) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">{c.monthlyPostCount}件/月</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* ログイン誘導 */}
        <div className="mt-8 bg-white rounded-2xl border border-slate-100 p-5 text-center">
          <p className="text-sm font-medium text-slate-700 mb-1">あなたもサークルを作ってみませんか？</p>
          <p className="text-xs text-slate-400 mb-4">無料・Google アカウントで30秒登録</p>
          <Link
            href="/"
            className="inline-block bg-slate-900 text-white text-sm font-medium px-6 py-2.5 rounded-full"
          >
            無料で始める →
          </Link>
        </div>
      </div>
    </div>
  );
}
