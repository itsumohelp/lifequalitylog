"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

type Expense = {
  id: string;
  amount: number;
  description: string;
  place: string | null;
  category: string;
  expenseDate: string;
  user: {
    name: string | null;
    image: string | null;
  };
};

type Props = {
  circleId: string;
  initialExpenses: Expense[];
};

const categoryEmojis: Record<string, string> = {
  FOOD: "🍽️",
  DAILY: "🛒",
  TRANSPORT: "🚃",
  ENTERTAINMENT: "🎮",
  UTILITY: "💡",
  MEDICAL: "🏥",
  OTHER: "📝",
};

const categoryLabels: Record<string, string> = {
  FOOD: "食費",
  DAILY: "日用品",
  TRANSPORT: "交通費",
  ENTERTAINMENT: "娯楽",
  UTILITY: "光熱費",
  MEDICAL: "医療",
  OTHER: "その他",
};

function formatYen(amount: number) {
  return new Intl.NumberFormat("ja-JP").format(amount);
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });
}

export default function ExpenseChat({ circleId, initialExpenses }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [expenses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ circleId, text: input.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "エラーが発生しました");
        return;
      }

      setExpenses((prev) => [...prev, data.expense]);
      setInput("");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // 日付でグループ化
  const groupedExpenses = expenses.reduce(
    (acc, expense) => {
      const dateKey = formatDate(expense.expenseDate);
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(expense);
      return acc;
    },
    {} as Record<string, Expense[]>
  );

  return (
    <div className="flex flex-col h-[calc(100dvh-120px)]">
      {/* メッセージ一覧 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-2 py-4 space-y-4"
      >
        {expenses.length === 0 ? (
          <div className="text-center text-slate-400 mt-8">
            <p className="mb-2">支出を入力してください</p>
            <p className="text-sm text-slate-500">
              例: 「コンビニで500円」「ランチ 800円」
            </p>
          </div>
        ) : (
          Object.entries(groupedExpenses).map(([date, dayExpenses]) => (
            <div key={date}>
              {/* 日付ヘッダー */}
              <div className="flex justify-center mb-3">
                <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full">
                  {date}
                </span>
              </div>

              {/* その日の支出 */}
              <div className="space-y-2">
                {dayExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-start gap-2">
                    {/* ユーザーアイコン */}
                    <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
                      {expense.user.image ? (
                        <Image
                          src={expense.user.image}
                          alt={expense.user.name || "User"}
                          width={32}
                          height={32}
                          className="w-8 h-8 object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 flex items-center justify-center text-xs text-slate-300">
                          {expense.user.name?.slice(0, 1) || "?"}
                        </div>
                      )}
                    </div>

                    {/* メッセージバブル */}
                    <div className="flex-1 max-w-[80%]">
                      <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">
                            {categoryEmojis[expense.category] || "📝"}
                          </span>
                          <span className="text-sky-300 font-semibold">
                            ¥{formatYen(expense.amount)}
                          </span>
                          <span className="text-xs text-slate-500">
                            {categoryLabels[expense.category] || "その他"}
                          </span>
                        </div>
                        <p className="text-sm text-slate-200">
                          {expense.description}
                        </p>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 ml-2">
                        {formatTime(expense.expenseDate)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mx-4 mb-2 px-4 py-2 bg-red-900/50 border border-red-700 rounded-lg text-sm text-red-200">
          {error}
        </div>
      )}

      {/* 入力フォーム */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-800">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="「〇〇で△△円」「〇〇 △△円」の形式で入力"
            disabled={isLoading}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-full px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-sky-500 text-white rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
          >
            {isLoading ? "..." : "送信"}
          </button>
        </div>
      </form>
    </div>
  );
}
