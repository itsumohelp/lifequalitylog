"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

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

const RECENT_TAGS_KEY = "recentTags";
const MAX_RECENT_TAGS = 10;

// ローカルストレージから直近タグを取得
function getRecentTags(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_TAGS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// ローカルストレージに直近タグを保存
function saveRecentTags(tags: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RECENT_TAGS_KEY, JSON.stringify(tags));
  } catch {
    // ストレージ容量オーバー等は無視
  }
}

// タグを使用した際に履歴に追加（重複は先頭に移動）
function addToRecentTags(newTags: string[]) {
  const current = getRecentTags();
  const updated = [...newTags];
  for (const tag of current) {
    if (!updated.includes(tag)) {
      updated.push(tag);
    }
  }
  const trimmed = updated.slice(0, MAX_RECENT_TAGS);
  saveRecentTags(trimmed);
  return trimmed;
}

export default function UnifiedChat({ initialFeed, circles, currentUserId }: Props) {
  const [feed, setFeed] = useState<FeedItem[]>(initialFeed);
  const [selectedCircleId, setSelectedCircleId] = useState<string>(circles[0]?.id || "");
  const [inputMode, setInputMode] = useState<InputMode>("expense");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentTags, setRecentTags] = useState<string[]>([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCircle = circles.find((c) => c.id === selectedCircleId);

  // 初期読み込み時に直近タグを取得
  useEffect(() => {
    setRecentTags(getRecentTags());
  }, []);

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

        // 使用したタグを直近タグに追加
        if (data.expense.tags && data.expense.tags.length > 0) {
          const updated = addToRecentTags(data.expense.tags);
          setRecentTags(updated);
        }

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
                        {/* ユーザー名 */}
                        <div
                          className={`text-[10px] text-slate-500 mb-0.5 ${
                            isOwnMessage ? "text-right" : ""
                          }`}
                        >
                          {item.userName}
                        </div>
                        <div
                          className={`rounded-2xl px-3 py-1.5 ${
                            isOwnMessage
                              ? "bg-slate-900 text-white rounded-tr-sm"
                              : "bg-white border border-slate-200 rounded-tl-sm"
                          }`}
                        >
                          {item.kind === "expense" ? (
                            <>
                              {/* サークル名 + 時間（1行目） */}
                              <div
                                className={`flex items-center justify-between text-xs mb-0.5 ${
                                  isOwnMessage ? "text-slate-300" : "text-slate-600"
                                }`}
                              >
                                <span className="font-medium">{item.circleName}</span>
                                <span className="text-[10px]">{formatTime(item.createdAt)}</span>
                              </div>
                              {/* 金額 + タグ（2行目） */}
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`font-semibold text-sm ${
                                    isOwnMessage ? "text-red-300" : "text-red-600"
                                  }`}
                                >
                                  ¥{formatYen(item.amount)}
                                </span>
                                {item.tags && item.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {item.tags.map((tag, idx) => (
                                      <span
                                        key={idx}
                                        className={`text-[10px] ${
                                          isOwnMessage ? "text-slate-400" : "text-slate-500"
                                        }`}
                                      >
                                        🏷️{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {/* ユーザー入力（3行目） */}
                              <div
                                className={`text-[10px] mt-0.5 ${
                                  isOwnMessage ? "text-slate-400" : "text-slate-500"
                                }`}
                              >
                                {item.description}
                              </div>
                            </>
                          ) : item.kind === "invite" ? (
                            <>
                              {/* サークル名 + 時間 */}
                              <div
                                className={`flex items-center justify-between text-xs mb-0.5 ${
                                  isOwnMessage ? "text-slate-300" : "text-slate-600"
                                }`}
                              >
                                <span className="font-medium">{item.circleName}</span>
                                <span className="text-[10px]">{formatTime(item.createdAt)}</span>
                              </div>
                              <p
                                className={`text-xs break-all ${
                                  isOwnMessage ? "text-sky-300" : "text-sky-600"
                                }`}
                              >
                                {item.inviteUrl}
                              </p>
                              <div
                                className={`text-[10px] mt-0.5 ${
                                  isOwnMessage ? "text-slate-400" : "text-slate-500"
                                }`}
                              >
                                招待リンク（コピー済み）
                              </div>
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
                              {/* サークル名 + 時間 */}
                              <div
                                className={`flex items-center justify-between text-xs mb-0.5 ${
                                  isOwnMessage ? "text-slate-300" : "text-slate-600"
                                }`}
                              >
                                <span className="font-medium">{item.circleName}</span>
                                <span className="text-[10px]">{formatTime(item.createdAt)}</span>
                              </div>
                              <div
                                className={`font-semibold text-sm ${
                                  isOwnMessage ? "text-white" : "text-slate-900"
                                }`}
                              >
                                ¥{formatYen(item.amount)}
                              </div>
                              {item.note && (
                                <p
                                  className={`text-[10px] mt-0.5 ${
                                    isOwnMessage ? "text-slate-300" : "text-slate-600"
                                  }`}
                                >
                                  {item.note}
                                </p>
                              )}
                            </>
                          )}
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

        {/* 直近タグ（フォーカス時は非表示） */}
        {!isInputFocused && recentTags.length > 0 && inputMode === "expense" && (
          <div className="px-3 py-1.5 overflow-x-auto">
            <div className="flex gap-1.5 whitespace-nowrap">
              {recentTags.map((tag, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setInput(tag + "　");
                    inputRef.current?.focus();
                  }}
                  className="inline-flex items-center gap-0.5 text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300 transition"
                >
                  🏷️{tag}
                </button>
              ))}
            </div>
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
              type="button"
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
              type="button"
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
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              placeholder={
                inputMode === "expense"
                  ? "「〇〇 △△円」の形式で入力"
                  : "現在の残高を数字で入力"
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
        </form>
      </div>
    </div>
  );
}
