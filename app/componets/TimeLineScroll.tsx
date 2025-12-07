// components/TimelineScroll.tsx
"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function TimelineScroll({ children }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 初期表示で一番下へスクロール
    el.scrollTop = el.scrollHeight;
  }, []);

  return (
    <section
      ref={ref}
      className="flex-1 overflow-y-auto no-scrollbar rounded-2xl bg-slate-900/40 border border-slate-800 px-3 py-3"
    >
      {children}
    </section>
  );
}
