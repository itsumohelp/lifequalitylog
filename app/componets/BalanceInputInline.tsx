"use client";

import { useEffect, useRef, useState } from "react";
import { addBalanceSnapshotBasic } from "../actions";

function formatYen(amount: number) {
  return new Intl.NumberFormat("ja-JP").format(amount);
}

export default function BalanceInputInline({ circleId }: { circleId: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  // ✅ input 用の ref
  const inputRef = useRef<HTMLInputElement | null>(null);

  // ✅ open になった瞬間に focus
  useEffect(() => {
    if (open) {
      // モバイルSafari対策で 1tick 遅らせると安定
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  return (
    <div className="mb-2">
      <div className="rounded-2xl bg-slate-800/80 px-3 py-2 border border-slate-700">
        {!open ? (
          // 通常時
          <button
            onClick={() => setOpen(true)}
            className="w-full flex items-center gap-2 text-left"
          >
            <div className="w-7 h-7 rounded-full bg-sky-400/90 flex items-center justify-center text-slate-950 text-lg leading-none">
              ＋
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-100">今日の残高を更新</span>
              <span className="text-[10px] text-slate-500">
                アイコンをタップして、数字だけ入力
              </span>
            </div>
          </button>
        ) : (
          // 入力フォーム表示時
          <div className="space-y-2">
            <form
              className="space-y-2"
              action={async (formData) => {
                await addBalanceSnapshotBasic(formData);
                setOpen(false);
                setValue("");
              }}
            >
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400">¥</span>
                <input
                  ref={inputRef} // ✅ ここ
                  type="number"
                  inputMode="numeric"
                  name="amount"
                  pattern="\d*"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="flex-1 text-base rounded bg-slate-900 px-2 py-1 text-slate-100 outline-none"
                  placeholder="1234567"
                />
              </div>

              <div className="flex justify-end gap-2">
                <input type="hidden" name="circleId" value={circleId} />
                <input
                  type="hidden"
                  name="date"
                  value={new Date().toISOString()}
                />
                <input type="hidden" name="note" value="" />

                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setValue("");
                  }}
                  className="text-[11px] text-slate-400"
                >
                  キャンセル
                </button>

                <button
                  type="submit"
                  className="text-[11px] font-semibold text-sky-300"
                  disabled={!value}
                >
                  更新
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
