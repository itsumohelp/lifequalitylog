"use client";

import { useState, useEffect } from "react";

type Notice = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  isActive: boolean;
  createdAt: string;
};

type JobStatus = "idle" | "loading" | "ok" | "error";

type JobResult = {
  // persona-post
  posted?: string[];
  skipped?: string[];
  failed?: string[];
  jstHour?: number;
  // daily
  activated?: string[];
  salaryPosted?: string[];
  daysSinceLaunch?: number;
  // persona-generate
  created?: string[];
  count?: number;
  skippedGen?: boolean;
};

const JOBS = [
  {
    key: "persona-post" as const,
    label: "ペルソナ投稿",
    desc: "アクティブなペルソナがVertex AIで支出を生成して投稿",
    interval: "5分ごと",
    color: "sky",
  },
  {
    key: "daily" as const,
    label: "日次ジョブ",
    desc: "新規ペルソナの活性化・給与収入の登録",
    interval: "毎日1回",
    color: "emerald",
  },
  {
    key: "persona-generate" as const,
    label: "ペルソナ生成",
    desc: "Vertex AIが新しいペルソナをランダム生成しDBに追加",
    interval: "1時間ごと",
    color: "violet",
  },
] as const;

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AIジョブ管理
  const [jobStatuses, setJobStatuses] = useState<Record<string, JobStatus>>({});
  const [jobResults, setJobResults] = useState<Record<string, JobResult>>({});
  const [jobErrors, setJobErrors] = useState<Record<string, string>>({});

  const runJob = async (jobKey: string) => {
    setJobStatuses((prev) => ({ ...prev, [jobKey]: "loading" }));
    setJobResults((prev) => ({ ...prev, [jobKey]: {} }));
    setJobErrors((prev) => ({ ...prev, [jobKey]: "" }));

    try {
      const res = await fetch("/api/admin/cron-trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job: jobKey }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.result?.error ?? data.error ?? "エラーが発生しました");
      }
      setJobResults((prev) => ({ ...prev, [jobKey]: data.result ?? {} }));
      setJobStatuses((prev) => ({ ...prev, [jobKey]: "ok" }));
    } catch (e) {
      setJobErrors((prev) => ({ ...prev, [jobKey]: (e as Error).message }));
      setJobStatuses((prev) => ({ ...prev, [jobKey]: "error" }));
    }
  };

  const load = async () => {
    const res = await fetch("/api/admin/notices");
    if (res.ok) {
      const data = await res.json();
      setNotices(data.notices);
    } else {
      setError("認証エラー: ADMIN_EMAILが一致しないか、未ログインです");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, link }),
    });
    if (res.ok) {
      setTitle("");
      setBody("");
      setLink("");
      await load();
    } else {
      const data = await res.json();
      setError(data.error || "エラーが発生しました");
    }
    setIsSubmitting(false);
  };

  const toggleActive = async (notice: Notice) => {
    await fetch(`/api/admin/notices/${notice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !notice.isActive }),
    });
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/admin/notices/${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">運営からのお知らせ 管理</h1>
        <a
          href="/admin/personas"
          className="text-xs text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50"
        >
          ペルソナ管理 →
        </a>
      </div>

      {/* AIジョブ手動実行 */}
      <section className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">AIジョブ 手動実行</h2>
        <div className="space-y-3">
          {JOBS.map((job) => {
            const status = jobStatuses[job.key] ?? "idle";
            const result = jobResults[job.key];
            const err = jobErrors[job.key];

            const colorMap: Record<string, string> = {
              sky: "bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300",
              emerald: "bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300",
              violet: "bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300",
            };

            return (
              <div key={job.key} className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{job.label}</p>
                    <p className="text-xs text-slate-500">{job.desc}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">通常: {job.interval}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => runJob(job.key)}
                    disabled={status === "loading"}
                    className={`flex-shrink-0 text-xs text-white px-3 py-1.5 rounded-lg font-medium transition ${colorMap[job.color]}`}
                  >
                    {status === "loading" ? "実行中..." : "実行"}
                  </button>
                </div>

                {/* 結果表示 */}
                {status === "ok" && result && (
                  <div className="mt-2 text-[11px] text-slate-600 bg-slate-50 rounded px-2 py-1.5 space-y-0.5">
                    {job.key === "persona-post" && (
                      <>
                        <p>投稿: {result.posted?.length ?? 0}件 ({result.posted?.join(", ") || "なし"})</p>
                        <p>スキップ: {result.skipped?.length ?? 0}件 / 失敗: {result.failed?.length ?? 0}件</p>
                        <p>実行時刻: {result.jstHour}時台 (JST)</p>
                      </>
                    )}
                    {job.key === "daily" && (
                      <>
                        <p>活性化: {result.activated?.join(", ") || "なし"}</p>
                        <p>給与登録: {result.salaryPosted?.join(", ") || "なし"}</p>
                        <p>サービス開始から {result.daysSinceLaunch} 日目</p>
                      </>
                    )}
                    {job.key === "persona-generate" && (
                      <>
                        {result.skippedGen
                          ? <p className="text-slate-400">今回は生成なし（確率により）</p>
                          : <p>生成: {result.created?.join(", ") || "なし"} ({result.count}人)</p>
                        }
                      </>
                    )}
                  </div>
                )}

                {status === "error" && err && (
                  <p className="mt-2 text-[11px] text-red-600 bg-red-50 rounded px-2 py-1.5">{err}</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 作成フォーム */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl p-4 mb-8 space-y-3"
      >
        <h2 className="text-sm font-semibold text-slate-700">新規作成</h2>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}
        <div>
          <label className="block text-xs text-slate-500 mb-1">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：メンテナンスのお知らせ"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">
            本文（任意）
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="詳細を入力..."
            rows={3}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400 resize-none"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">
            リンクURL（任意）
          </label>
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://apps.apple.com/..."
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
          />
        </div>
        <button
          type="submit"
          disabled={!title.trim() || isSubmitting}
          className="w-full bg-slate-900 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
        >
          {isSubmitting ? "送信中..." : "投稿する"}
        </button>
      </form>

      {/* 一覧 */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">
          投稿済み（{notices.length}件）
        </h2>
        {notices.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">
            まだお知らせがありません
          </p>
        )}
        {notices.map((notice) => (
          <div
            key={notice.id}
            className={`bg-white border rounded-xl p-4 ${notice.isActive ? "border-slate-200" : "border-slate-100 opacity-50"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {notice.title}
                </p>
                {notice.body && (
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                    {notice.body}
                  </p>
                )}
                {notice.link && (
                  <p className="text-[10px] text-sky-500 mt-0.5 truncate">
                    🔗 {notice.link}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 mt-1">
                  {new Date(notice.createdAt).toLocaleString("ja-JP")}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => toggleActive(notice)}
                  className={`text-[10px] px-2 py-1 rounded-full border transition ${notice.isActive ? "border-emerald-300 text-emerald-600 bg-emerald-50" : "border-slate-300 text-slate-400"}`}
                >
                  {notice.isActive ? "公開中" : "非公開"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(notice.id)}
                  className="text-[10px] px-2 py-1 rounded-full border border-red-200 text-red-400 hover:bg-red-50 transition"
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
