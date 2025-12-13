// components/Fab.tsx
"use client";

import { createContext, useState } from "react";
import Link from "next/link";

export default function Fab({
  enable,
  setEnable,
}: {
  enable: boolean;
  setEnable: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed right-4 bottom-4 z-40">
      {/* メニュー（開いている時だけ表示） */}
      {open && (
        <div className="mb-3 rounded-2xl bg-slate-900/95 border border-slate-700 shadow-lg px-3 py-2 text-[12px] text-slate-100">
          <div className="flex flex-col gap-1">
            <Link
              href="/circles/new"
              className="px-1 py-1 rounded hover:bg-slate-800/80"
              onClick={() => setOpen(false)}
            >
              サークルを作成
            </Link>
            <Link
              href="/circles"
              className="px-1 py-1 rounded hover:bg-slate-800/80"
              onClick={() => setOpen(false)}
            >
              サークルの残高を記録
            </Link>
          </div>
        </div>
      )}

      {enable && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-12 h-12 rounded-full bg-sky-600 hover:bg-sky-500 text-white shadow-lg flex items-center justify-center text-2xl leading-none"
          aria-label="アクションを開く"
        >
          +
        </button>
      )}
    </div>
  );
}
