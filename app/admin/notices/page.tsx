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

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <h1 className="text-xl font-bold text-slate-900 mb-6">
        運営からのお知らせ 管理
      </h1>

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
