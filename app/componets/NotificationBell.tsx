"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { InboxItem } from "@/app/api/notifications/inbox/route";

function kindLabel(kind: InboxItem["kind"]) {
  if (kind === "claim") return "請求";
  if (kind === "warikan_reminder") return "未回収";
  return "お知らせ";
}

function kindColor(kind: InboxItem["kind"]) {
  if (kind === "claim") return "text-red-500 bg-red-50 border-red-100";
  if (kind === "warikan_reminder") return "text-orange-500 bg-orange-50 border-orange-100";
  return "text-sky-600 bg-sky-50 border-sky-100";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const drawerRef = useRef<HTMLDivElement>(null);

  const fetchInbox = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/inbox", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      } else {
        console.error("[NotificationBell] inbox API error:", res.status);
      }
    } catch (e) {
      console.error("[NotificationBell] fetch failed:", e);
    }
  }, []);

  useEffect(() => {
    fetchInbox();
    // 60秒ごとにポーリング
    const id = setInterval(fetchInbox, 60_000);
    return () => clearInterval(id);
  }, [fetchInbox]);

  // ドロワーを開いたとき既読にする
  const handleOpen = async () => {
    setOpen(true);
    if (unreadCount > 0) {
      try {
        await fetch("/api/notifications/inbox", { method: "POST" });
        setUnreadCount(0);
        setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
      } catch {
        // silent
      }
    }
  };

  // ドロワー外クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <>
      {/* ベルアイコン */}
      <button
        type="button"
        onClick={open ? () => setOpen(false) : handleOpen}
        className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-sky-300/50 transition"
        aria-label="通知"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-slate-700"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* ドロワーオーバーレイ */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12">
          <div className="absolute inset-0 bg-black/20" onClick={() => setOpen(false)} />
          <div
            ref={drawerRef}
            className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl overflow-hidden"
            style={{ maxHeight: "calc(100dvh - 80px)" }}
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">通知</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* リスト */}
            <div className="overflow-y-auto" style={{ maxHeight: "calc(100dvh - 140px)" }}>
              {items.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-12">通知はありません</p>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {items.map((item) => (
                    <li key={item.id} className={`px-4 py-3 ${item.isRead ? "" : "bg-sky-50/60"}`}>
                      {item.itemUrl ? (
                        <a
                          href={item.itemUrl}
                          className="block"
                          onClick={() => setOpen(false)}
                        >
                          <ItemContent item={item} />
                        </a>
                      ) : (
                        <ItemContent item={item} />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ItemContent({ item }: { item: InboxItem }) {
  return (
    <div className="flex items-start gap-3">
      {/* 種別バッジ */}
      <span
        className={`mt-0.5 flex-shrink-0 text-[10px] font-semibold border rounded-full px-2 py-0.5 ${kindColor(item.kind)}`}
      >
        {kindLabel(item.kind)}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-xs font-semibold truncate ${item.isRead ? "text-slate-700" : "text-slate-900"}`}>
            {item.title}
          </p>
          {!item.isRead && (
            <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-sky-500" />
          )}
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5 truncate">{item.body}</p>
        <div className="flex items-center gap-2 mt-1">
          {item.circleName && (
            <span className="text-[10px] text-slate-400">{item.circleName}</span>
          )}
          <span className="text-[10px] text-slate-300">{formatDate(item.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
