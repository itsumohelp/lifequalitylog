// components/TimeLineScroll.tsx
"use client";

import React, {
  createContext,
  useContext,
  useRef,
  type ReactNode,
} from "react";

const TimelineScrollContext =
  createContext<React.RefObject<HTMLDivElement> | null>(null);

export function useTimelineScrollContainer() {
  const ctx = useContext(TimelineScrollContext);
  if (!ctx)
    throw new Error(
      "useTimelineScrollContainer must be used within TimeLineScroll",
    );
  return ctx;
}

export default function TimeLineScroll({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null!);

  return (
    <TimelineScrollContext.Provider value={containerRef}>
      <div className="relative mt-2">
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
            h-[calc(100dvh-214px)]
            overflow-y-auto
            [overflow-anchor:none]
          "
        >
          {/* 上から積む */}
          <div className="min-h-full flex flex-col">{children}</div>
        </div>
      </div>
    </TimelineScrollContext.Provider>
  );
}
