"use client";

import { useState } from "react";

type CircleBalance = {
  circleId: string;
  circleName: string;
  balance: number;
};

type Props = {
  totalBalance: number;
  balanceDiff: number;
  yesterdayBalance: number;
  monthlyExpense: number;
  circleBalances: CircleBalance[];
};

function formatYen(amount: number) {
  return new Intl.NumberFormat("ja-JP").format(amount);
}

export default function BalanceHeader({
  totalBalance,
  balanceDiff,
  yesterdayBalance,
  monthlyExpense,
  circleBalances,
}: Props) {
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  return (
    <div className="rounded-xl bg-slate-900 px-3 py-1.5">
      <div className="flex items-center justify-center gap-2">
        <span className="font-semibold text-white text-xl">
          ¥{formatYen(totalBalance)}
        </span>
        {yesterdayBalance !== 0 && (
          <span
            className={`text-xs ${
              balanceDiff >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            ({balanceDiff >= 0 ? "+" : ""}¥{formatYen(balanceDiff)})
          </span>
        )}
        {/* 内訳ボタン */}
        {circleBalances.length > 0 && (
          <button
            type="button"
            onClick={() => setIsBreakdownOpen(!isBreakdownOpen)}
            className="ml-auto text-[10px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded border border-slate-600 hover:border-slate-500 transition"
          >
            内訳
          </button>
        )}
      </div>
      {/* 当月支出 */}
      <div className="flex items-center justify-center gap-1 mt-0.5">
        <span className="text-[10px] text-slate-400">当月支出</span>
        <span className="text-[10px] text-red-400">
          -¥{formatYen(monthlyExpense)}
        </span>
      </div>

      {/* サークル別残高（内訳） */}
      {isBreakdownOpen && circleBalances.length > 0 && (
        <div className="mt-2 bg-slate-800 rounded-lg p-2 relative">
          {/* 閉じるボタン */}
          <button
            type="button"
            onClick={() => setIsBreakdownOpen(false)}
            className="absolute top-1 right-1 text-slate-500 hover:text-slate-300 p-1"
            title="閉じる"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div className="space-y-1 pr-5">
            {circleBalances.map((cb) => (
              <div
                key={cb.circleId}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-slate-400 truncate mr-2">
                  {cb.circleName}
                </span>
                <span
                  className={`font-medium whitespace-nowrap ${
                    cb.balance < 0 ? "text-red-400" : "text-white"
                  }`}
                >
                  ¥{formatYen(cb.balance)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
