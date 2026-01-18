"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { parseExpenseInput, getCategoryEmoji } from "@/lib/expenseParser";

type FeedItem = {
  id: string;
  kind: "snapshot" | "expense" | "invite";
  circleId: string;
  circleName: string;
  userId: string;
  userName: string;
  userImage: string | null;
  amount: number;
  description?: string;
  place?: string | null;
  category?: string;
  tags?: string[];
  note?: string | null;
  inviteUrl?: string;
  createdAt: string;
};

type Circle = {
  id: string;
  name: string;
};

type Props = {
  initialFeed: FeedItem[];
  circles: Circle[];
  currentUserId: string;
};

type InputMode = "expense" | "snapshot";

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

export default function UnifiedChat({ initialFeed, circles, currentUserId }: Props) {
  const [feed, setFeed] = useState<FeedItem[]>(initialFeed);
  const [selectedCircleId, setSelectedCircleId] = useState<string>(circles[0]?.id || "");
  const [inputMode, setInputMode] = useState<InputMode>("expense");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCircle = circles.find((c) => c.id === selectedCircleId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [feed]);

  // 招待コマンドかどうかをチェック
  const isInviteCommand = (text: string) => {
    const normalized = text.trim().toLowerCase();
    return normalized === "招待" || normalized === "しょうたい" || normalized === "invite";
  };

  // 招待リンクを生成してクリップボードにコピー
  const handleInvite = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const inviteUrl = `${origin}/join?circleId=${encodeURIComponent(selectedCircleId)}`;

    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      // クリップボードへのコピーに失敗してもフィードには表示
    }

    const inviteItem: FeedItem = {
      id: `invite-${Date.now()}`,
      kind: "invite",
      circleId: selectedCircleId,
      circleName: selectedCircle?.name || "",
      userId: currentUserId,
      userName: "自分",
      userImage: null,
      amount: 0,
      inviteUrl,
      createdAt: new Date().toISOString(),
    };

    setFeed((prev) => [...prev, inviteItem]);
    setInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !selectedCircleId) return;

    // 招待コマンドの処理
    if (isInviteCommand(input)) {
      await handleInvite();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (inputMode === "expense") {
        // 支出入力
        const res = await fetch("/api/expense", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ circleId: selectedCircleId, text: input.trim() }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "エラーが発生しました");
          return;
        }

        const newItem: FeedItem = {
          id: `expense-${data.expense.id}`,
          kind: "expense",
          circleId: data.expense.circleId,
          circleName: selectedCircle?.name || "",
          userId: currentUserId,
          userName: data.expense.user.name || "自分",
          userImage: data.expense.user.image,
          amount: -data.expense.amount, // 支出はマイナス表記
          description: data.expense.description,
          place: data.expense.place,
          category: data.expense.category,
          tags: data.expense.tags || [],
          createdAt: new Date().toISOString(),
        };

        setFeed((prev) => [...prev, newItem]);
      } else {
        // 残高更新
        const amount = parseInt(input.replace(/[^0-9]/g, ""), 10);
        if (isNaN(amount) || amount <= 0) {
          setError("金額を入力してください");
          return;
        }

        const res = await fetch("/api/snapshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ circleId: selectedCircleId, amount }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "エラーが発生しました");
          return;
        }

        setFeed((prev) => [...prev, data.snapshot]);
      }

      setInput("");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // 日付でグループ化
  const groupedFeed = feed.reduce(
    (acc, item) => {
      const dateKey = formatDate(item.createdAt);
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(item);
      return acc;
    },
    {} as Record<string, FeedItem[]>
  );

  return (
    <div className="flex flex-col h-[calc(100dvh-100px)]">
      {/* フィード表示 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-4 bg-slate-50"
      >
        {feed.length === 0 ? (
          <div className="text-center text-slate-500 mt-8">
            <p className="mb-2">まだ記録がありません</p>
            <p className="text-sm">サークルを選んで入力してください</p>
          </div>
        ) : (
          Object.entries(groupedFeed).map(([date, items]) => (
            <div key={date}>
              {/* 日付ヘッダー */}
              <div className="flex justify-center mb-3">
                <span className="text-xs text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                  {date}
                </span>
              </div>

              {/* その日のアイテム */}
              <div className="space-y-2">
                {items.map((item) => {
                  const isOwnMessage = item.userId === currentUserId;

                  return (
                    <div
                      key={item.id}
                      className={`flex items-start gap-2 ${
                        isOwnMessage ? "flex-row-reverse" : ""
                      }`}
                    >
                      {/* ユーザーアイコン */}
                      <div className="w-8 h-8 rounded-full bg-slate-300 overflow-hidden flex-shrink-0">
                        {item.userImage ? (
                          <Image
                            src={item.userImage}
                            alt={item.userName}
                            width={32}
                            height={32}
                            className="w-8 h-8 object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 flex items-center justify-center text-xs text-slate-600">
                            {item.userName?.slice(0, 1) || "?"}
                          </div>
                        )}
                      </div>

                      {/* メッセージバブル */}
                      <div className={`max-w-[75%] ${isOwnMessage ? "items-end" : ""}`}>
                        {/* サークル名ラベル */}
                        <div
                          className={`text-[10px] text-slate-500 mb-0.5 ${
                            isOwnMessage ? "text-right" : ""
                          }`}
                        >
                          {item.circleName}
                        </div>

                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            isOwnMessage
                              ? "bg-slate-900 text-white rounded-tr-sm"
                              : "bg-white border border-slate-200 rounded-tl-sm"
                          }`}
                        >
                          {item.kind === "expense" ? (
                            <>
                              {/* タグ表示 */}
                              {item.tags && item.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-1">
                                  {item.tags.map((tag, idx) => (
                                    <span
                                      key={idx}
                                      className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                                        isOwnMessage
                                          ? "bg-slate-700 text-slate-300"
                                          : "bg-slate-100 text-slate-600"
                                      }`}
                                    >
                                      <span>🏷️</span>
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-base">
                                  {getCategoryEmoji(item.category as any) || "📝"}
                                </span>
                                <span
                                  className={`font-semibold ${
                                    isOwnMessage ? "text-red-300" : "text-red-600"
                                  }`}
                                >
                                  ¥{formatYen(item.amount)}
                                </span>
                              </div>
                              <p
                                className={`text-sm ${
                                  isOwnMessage ? "text-slate-200" : "text-slate-700"
                                }`}
                              >
                                {item.description}
                              </p>
                            </>
                          ) : item.kind === "invite" ? (
                            <>
                              <div
                                className={`text-[11px] mb-1 ${
                                  isOwnMessage ? "text-slate-400" : "text-slate-500"
                                }`}
                              >
                                招待リンク（コピー済み）
                              </div>
                              <p
                                className={`text-xs break-all ${
                                  isOwnMessage ? "text-sky-300" : "text-sky-600"
                                }`}
                              >
                                {item.inviteUrl}
                              </p>
                              <button
                                onClick={async () => {
                                  if (item.inviteUrl) {
                                    await navigator.clipboard.writeText(item.inviteUrl);
                                  }
                                }}
                                className={`mt-2 text-[10px] px-2 py-1 rounded-full border ${
                                  isOwnMessage
                                    ? "border-slate-600 text-slate-300 hover:bg-slate-700"
                                    : "border-slate-300 text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                再コピー
                              </button>
                            </>
                          ) : (
                            <>
                              <div
                                className={`text-[11px] mb-1 ${
                                  isOwnMessage ? "text-slate-400" : "text-slate-500"
                                }`}
                              >
                                残高更新
                              </div>
                              <div
                                className={`font-semibold ${
                                  isOwnMessage ? "text-white" : "text-slate-900"
                                }`}
                              >
                                ¥{formatYen(item.amount)}
                              </div>
                              {item.note && (
                                <p
                                  className={`text-sm mt-1 ${
                                    isOwnMessage ? "text-slate-300" : "text-slate-600"
                                  }`}
                                >
                                  {item.note}
                                </p>
                              )}
                            </>
                          )}
                        </div>

                        <div
                          className={`text-[10px] text-slate-400 mt-1 ${
                            isOwnMessage ? "text-right" : ""
                          }`}
                        >
                          {formatTime(item.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 入力エリア（画面下部に固定） */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200">
        {/* エラー表示 */}
        {error && (
          <div className="mx-3 mt-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* サークル選択 + モード切替 */}
        <div className="flex items-center gap-2 px-3 py-2">
          <select
            value={selectedCircleId}
            onChange={(e) => setSelectedCircleId(e.target.value)}
            className="flex-1 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-slate-400"
          >
            {circles.map((circle) => (
              <option key={circle.id} value={circle.id}>
                {circle.name}
              </option>
            ))}
          </select>

          {/* モード切替トグル */}
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setInputMode("expense")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                inputMode === "expense"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              支出
            </button>
            <button
              onClick={() => setInputMode("snapshot")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                inputMode === "snapshot"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              残高
            </button>
          </div>
        </div>

        {/* 入力フォーム */}
        <form
          onSubmit={handleSubmit}
          className="px-3 pb-3 pt-0"
        >
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type={inputMode === "snapshot" ? "number" : "text"}
              inputMode={inputMode === "snapshot" ? "numeric" : "text"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                inputMode === "expense"
                  ? "コンビニで500円"
                  : "現在の残高を入力"
              }
              disabled={isLoading || !selectedCircleId}
              className="flex-1 bg-slate-100 border border-slate-200 rounded-full px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || !selectedCircleId}
              className="bg-slate-900 text-white rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
            >
              {isLoading ? "..." : "送信"}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 text-center">
            {inputMode === "expense"
              ? "「〇〇で△△円」の形式で入力"
              : "現在の口座残高を数字で入力"}
          </p>
        </form>
      </div>
    </div>
  );
}
