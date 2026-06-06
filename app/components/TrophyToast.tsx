"use client";

import { useEffect, useState } from "react";
import type { TrophyDifficulty } from "@/lib/trophies";

export type ToastTrophy = {
  key: string;
  name: string;
  icon: string;
  difficulty: TrophyDifficulty;
};

const bgColor: Record<TrophyDifficulty, string> = {
  low:    "bg-emerald-600",
  medium: "bg-sky-600",
  high:   "bg-amber-500",
};
const label: Record<TrophyDifficulty, string> = {
  low: "LOW", medium: "MID", high: "HIGH",
};

export default function TrophyToast({
  trophy,
  onDone,
}: {
  trophy: ToastTrophy;
  onDone: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 50);
    const t2 = setTimeout(() => setVisible(false), 3200);
    const t3 = setTimeout(() => onDone(), 3700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 pointer-events-none ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div className="flex items-center gap-3 bg-slate-900/90 backdrop-blur-sm text-white px-4 py-3 rounded-2xl shadow-xl min-w-[220px]">
        <span className="text-3xl">{trophy.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${bgColor[trophy.difficulty]}`}>
              {label[trophy.difficulty]}
            </span>
            <span className="text-[10px] text-slate-400">トロフィー獲得！</span>
          </div>
          <div className="text-sm font-semibold">{trophy.name}</div>
        </div>
      </div>
    </div>
  );
}
