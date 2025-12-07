// components/TimeLineScroll.tsx
"use client";

import { useEffect, useRef, type ReactNode } from "react";

export default function TimeLineScroll({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 初期表示で一番下までスクロール
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, []);

  return (
    <div className="relative mt-2">
      {/* スクロールする本体 */}
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
          /* ★ iPhone の Safari アドレスバー込みで動く dvh を使う */
          h-[calc(100dvh-315px)]
          overflow-y-auto
        "
      >
        {/* ★ 中身を下寄せにするラッパー */}
        <div className="min-h-full flex flex-col justify-end">{children}</div>
      </div>

      {/* スクロールできそう感を出す上部グラデーション */}
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
