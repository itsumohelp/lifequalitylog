// components/TimeLineScroll.tsx
"use client";

import { useEffect, useRef, type ReactNode } from "react";

export default function TimeLineScroll({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 初期表示時に一番下までスクロール
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // 一度レイアウトが終わってからスクロールした方が安定するので少し遅らせる
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, []);

  return (
    <div className="relative mt-2">
      {/* スクロールできる本体 */}
      <div
        ref={containerRef}
        className="
          no-scrollbar
          rounded-2xl
          bg-slate-900/40
          border
          border-slate-800
          px-3
          py-3
          max-h-[calc(100vh-315px)]
          overflow-y-auto
        "
      >
        {children}
      </div>

      {/* スクロールできそう感を出す半透明グラデーション（上部） */}
      <div
        className="
          pointer-events-none
          absolute
          inset-x-0
          top-0
          h-5
          rounded-t-2xl
          bg-gradient-to-b
          from-slate-950/85
          to-transparent
        "
      />
    </div>
  );
}
