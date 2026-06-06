"use client";

import { useEffect, useState, useCallback } from "react";
import TrophyToast, { type ToastTrophy } from "./TrophyToast";

type ApiTrophy = { key: string; name: string; icon: string; difficulty: "low" | "medium" | "high" };

export default function TrophyNotifier() {
  const [queue, setQueue] = useState<ToastTrophy[]>([]);
  const [current, setCurrent] = useState<ToastTrophy | null>(null);

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) return;
      const data = await res.json();
      if (!data.newlyEarned?.length) return;
      const toasts: ToastTrophy[] = (data.trophies as ApiTrophy[])
        .filter((t) => data.newlyEarned.includes(t.key))
        .map((t) => ({ key: t.key, name: t.name, icon: t.icon, difficulty: t.difficulty }));
      setQueue((q) => [...q, ...toasts]);
    } catch {}
  }, []);

  // セッション開始時に1回チェック
  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    if (sessionStorage.getItem("trophy-checked")) return;
    sessionStorage.setItem("trophy-checked", "1");
    check();
  }, [check]);

  // 投稿後にチェック（UnifiedChatが expense-posted イベントを発火）
  useEffect(() => {
    window.addEventListener("expense-posted", check);
    return () => window.removeEventListener("expense-posted", check);
  }, [check]);

  // キューを順番に表示
  const advance = useCallback(() => {
    setCurrent(null);
    setQueue((q) => q.slice(1));
  }, []);

  useEffect(() => {
    if (!current && queue.length > 0) {
      const t = setTimeout(() => setCurrent(queue[0]), 400);
      return () => clearTimeout(t);
    }
  }, [queue, current]);

  if (!current) return null;
  return <TrophyToast trophy={current} onDone={advance} />;
}
