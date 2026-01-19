"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { getCategoryEmoji } from "@/lib/expenseParser";
import type { ExpenseCategory } from "@/app/generated/prisma/enums";

type TagSummaryData = {
  circleName: string;
  tag: string;
  total: number;
  count: number;
};

type FeedItem = {
  id: string;
  kind: "snapshot" | "expense" | "income" | "summary" | "invite";
  circleId: string;
  circleName?: string;
  userId: string;
  userName: string;
  userImage: string | null;
  amount: number;
  cumulativeExpense?: number;
  description?: string;
  place?: string | null;
  source?: string | null;
  category?: string;
  tags?: string[];
  note?: string | null;
  summaryData?: TagSummaryData[];
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

type InputMode = "expense" | "income" | "snapshot";

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
  const [isCircleModalOpen, setIsCircleModalOpen] = useState(false);
  const [newCircleName, setNewCircleName] = useState("");
  const [isCreatingCircle, setIsCreatingCircle] = useState(false);
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

  // サークルコマンドかどうかをチェック
  const isCircleCommand = (text: string) => {
    const normalized = text.trim().toLowerCase();
    return (
      normalized === "サークル" ||
      normalized === "さーくる" ||
      normalized === "circle" ||
      normalized === "cl" ||
      normalized === "さ" ||
      normalized === "サ"
    );
  };

  // サークル追加コマンドかどうかをチェック
  const isCircleAddCommand = (text: string) => {
    const normalized = text.trim().toLowerCase();
    return (
      normalized === "サークル追加" ||
      normalized === "さーくるついか" ||
      normalized === "さつ" ||
      normalized === "circleadd" ||
      normalized === "ca"
    );
  };

  // 集計コマンドかどうかをチェック
  const isSummaryCommand = (text: string) => {
    const normalized = text.trim().toLowerCase();
    return (
      normalized === "集計" ||
      normalized === "し" ||
      normalized === "しゅうけい"
    );
  };

  // 招待リンクを生成
  const handleInvite = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const inviteUrl = `${origin}/join?circleId=${encodeURIComponent(selectedCircleId)}`;

    // クリップボードにコピー
    navigator.clipboard.writeText(inviteUrl).catch(() => {});

    // フィードに招待アイテムを追加
    const inviteItem: FeedItem = {
      id: `invite-${Date.now()}`,
      kind: "invite",
      circleId: selectedCircleId,
      circleName: selectedCircle?.name,
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

  // 新しいサークルを作成
  const handleCreateCircle = async () => {
    if (!newCircleName.trim() || isCreatingCircle) return;

    setIsCreatingCircle(true);
    try {
      const res = await fetch("/api/circle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCircleName.trim() }),
      });

      if (res.ok) {
        // ページをリロードして新しいサークルを反映
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error || "サークルの作成に失敗しました");
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setIsCreatingCircle(false);
      setIsCircleModalOpen(false);
      setNewCircleName("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !selectedCircleId) return;

    // 招待コマンドの処理
    if (isInviteCommand(input)) {
      handleInvite();
      return;
    }

    // サークル追加コマンドの処理（モーダルを表示）
    if (isCircleAddCommand(input)) {
      setInput("");
      setIsCircleModalOpen(true);
      return;
    }

    // サークルコマンドの処理（サークル一覧へのリンクを表示）
    if (isCircleCommand(input)) {
      const linkItem: FeedItem = {
        id: `link-${Date.now()}`,
        kind: "invite", // リンク表示用に流用
        circleId: selectedCircleId,
        circleName: selectedCircle?.name,
        userId: currentUserId,
        userName: "自分",
        userImage: null,
        amount: 0,
        inviteUrl: "/circles",
        note: "サークル一覧",
        createdAt: new Date().toISOString(),
      };
      setFeed((prev) => [...prev, linkItem]);
      setInput("");
      return;
    }

    // 集計コマンドの処理（タグ別集計を表示）
    if (isSummaryCommand(input)) {
      setInput("");
      setIsLoading(true);
      try {
        const res = await fetch("/api/summary");
        if (res.ok) {
          const data = await res.json();
          const summaryItem: FeedItem = {
            id: `summary-${Date.now()}`,
            kind: "summary",
            circleId: selectedCircleId,
            userId: currentUserId,
            userName: "自分",
            userImage: null,
            amount: 0,
            summaryData: data.summary,
            createdAt: new Date().toISOString(),
          };
          setFeed((prev) => [...prev, summaryItem]);
        } else {
          setError("集計の取得に失敗しました");
        }
      } catch {
        setError("通信エラーが発生しました");
      } finally {
        setIsLoading(false);
      }
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
          circleName: selectedCircle?.name,
          userId: currentUserId,
          userName: data.expense.user.name || "自分",
          userImage: data.expense.user.image,
          amount: -data.expense.amount,
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
      } else if (inputMode === "income") {
        // 収入入力
        const res = await fetch("/api/income", {
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
          id: `income-${data.income.id}`,
          kind: "income",
          circleId: data.income.circleId,
          circleName: selectedCircle?.name,
          userId: currentUserId,
          userName: data.income.user.name || "自分",
          userImage: data.income.user.image,
          amount: data.income.amount,
          description: data.income.description,
          source: data.income.source,
          category: data.income.category,
          tags: data.income.tags || [],
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
    <div className="flex flex-col flex-1 min-h-0">
      {/* フィード表示 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-4 bg-slate-50 min-h-0"
      >
        {feed.length === 0 ? (
          <div className="text-center text-slate-500 mt-8">
            <p className="mb-2">まだ記録がありません</p>
            <p className="text-sm">支出や残高を入力してください</p>
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

                      {/* メッセージ部分 */}
                      <div className={`max-w-[70%] ${isOwnMessage ? "items-end" : ""}`}>
                        {/* 投稿者名（バブルの上） */}
                        <div
                          className={`text-[10px] text-slate-500 mb-0.5 ${
                            isOwnMessage ? "text-right" : ""
                          }`}
                        >
                          {item.userName}
                        </div>

                        {/* メッセージバブル */}
                        <div
                          className={`rounded-2xl px-3 py-1.5 ${
                            isOwnMessage
                              ? "bg-slate-900 text-white rounded-tr-sm"
                              : "bg-white border border-slate-200 rounded-tl-sm"
                          }`}
                        >
                          {/* サークル名 + 時刻（バブル内上部） */}
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-xs font-medium ${
                                isOwnMessage ? "text-slate-300" : "text-slate-700"
                              }`}
                            >
                              {item.circleName || "（名前なし）"}
                            </span>
                            <span
                              className={`text-[10px] ${
                                isOwnMessage ? "text-slate-500" : "text-slate-400"
                              }`}
                            >
                              {formatTime(item.createdAt)}
                            </span>
                          </div>

                          {item.kind === "expense" ? (
                            <>
                              {/* カテゴリ絵文字 + 金額 + 累計 + タグバッジ */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm">
                                  {getCategoryEmoji((item.category || "OTHER") as ExpenseCategory)}
                                </span>
                                <span
                                  className={`font-semibold text-sm ${
                                    isOwnMessage ? "text-red-300" : "text-red-600"
                                  }`}
                                >
                                  ¥{formatYen(item.amount)}
                                </span>
                                {item.cumulativeExpense !== undefined && (
                                  <span
                                    className={`text-xs ${
                                      isOwnMessage ? "text-slate-400" : "text-slate-500"
                                    }`}
                                  >
                                    (-¥{formatYen(item.cumulativeExpense)})
                                  </span>
                                )}
                                {item.tags && item.tags.length > 0 && (
                                  <>
                                    {item.tags.map((tag, idx) => (
                                      <span
                                        key={idx}
                                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                                          isOwnMessage
                                            ? "bg-sky-600 text-sky-100"
                                            : "bg-sky-100 text-sky-700"
                                        }`}
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </>
                                )}
                              </div>
                            </>
                          ) : item.kind === "income" ? (
                            <>
                              {/* 収入 */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm">💰</span>
                                <span
                                  className={`font-semibold text-sm ${
                                    isOwnMessage ? "text-emerald-300" : "text-emerald-600"
                                  }`}
                                >
                                  +¥{formatYen(item.amount)}
                                </span>
                                {item.tags && item.tags.length > 0 && (
                                  <>
                                    {item.tags.map((tag, idx) => (
                                      <span
                                        key={idx}
                                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                                          isOwnMessage
                                            ? "bg-emerald-600 text-emerald-100"
                                            : "bg-emerald-100 text-emerald-700"
                                        }`}
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </>
                                )}
                              </div>
                            </>
                          ) : item.kind === "invite" ? (
                            <>
                              {/* 招待リンク */}
                              <div className="text-xs font-medium mb-1">
                                📨 招待リンクをコピーしました
                              </div>
                              <div
                                className={`text-[10px] break-all ${
                                  isOwnMessage ? "text-slate-400" : "text-slate-500"
                                }`}
                              >
                                {item.inviteUrl}
                              </div>
                            </>
                          ) : item.kind === "summary" ? (
                            <>
                              {/* 集計表示 */}
                              <div className="text-xs font-medium mb-2">
                                📊 今月のタグ別集計
                              </div>
                              {item.summaryData && item.summaryData.length > 0 ? (
                                <div className="space-y-1.5">
                                  {item.summaryData.map((s, idx) => (
                                    <div
                                      key={idx}
                                      className={`flex items-center justify-between text-xs ${
                                        isOwnMessage ? "text-slate-200" : "text-slate-700"
                                      }`}
                                    >
                                      <span
                                        className={`px-2 py-0.5 rounded-full ${
                                          isOwnMessage
                                            ? "bg-sky-600 text-sky-100"
                                            : "bg-sky-100 text-sky-700"
                                        }`}
                                      >
                                        {s.tag}
                                      </span>
                                      <span
                                        className={`font-medium ${
                                          isOwnMessage ? "text-red-300" : "text-red-600"
                                        }`}
                                      >
                                        -¥{formatYen(s.total)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div
                                  className={`text-[10px] ${
                                    isOwnMessage ? "text-slate-400" : "text-slate-500"
                                  }`}
                                >
                                  今月のタグ付き支出がありません
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              {/* 残高スナップショット */}
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
          <div className="px-3 pt-2 pb-1 overflow-x-auto">
            <div className="flex gap-1.5 whitespace-nowrap">
              {recentTags.map((tag, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setInput(tag + "　");
                    inputRef.current?.focus();
                  }}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 hover:bg-sky-200 active:bg-sky-300 transition"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* サークル選択 + アクションボタン */}
        <div className="px-3 py-1.5 flex items-center gap-2">
          <select
            value={selectedCircleId}
            onChange={(e) => setSelectedCircleId(e.target.value)}
            className="flex-1 min-w-0 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-slate-400"
          >
            {circles.map((circle) => (
              <option key={circle.id} value={circle.id}>
                {circle.name || "（名前なし）"}
              </option>
            ))}
          </select>

          {/* 集計ボタン */}
          <button
            type="button"
            onClick={() => {
              // TODO: 集計機能
            }}
            className="flex-shrink-0 p-2.5 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300 active:scale-95 transition"
            title="集計"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="M18 17V9" />
              <path d="M13 17V5" />
              <path d="M8 17v-3" />
            </svg>
          </button>

          {/* 共有ボタン */}
          <button
            type="button"
            onClick={() => {
              // TODO: 共有機能
            }}
            className="flex-shrink-0 p-2.5 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300 active:scale-95 transition"
            title="共有"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>

          {/* 設定ボタン */}
          <button
            type="button"
            onClick={() => {
              // TODO: 設定機能
            }}
            className="flex-shrink-0 p-2.5 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300 active:scale-95 transition"
            title="設定"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>

        {/* 入力フォーム：モード切替 + 入力 + 送信 */}
        <form
          onSubmit={handleSubmit}
          className="px-3 pb-3 pt-1"
        >
          <div className="flex items-center gap-2">
            {/* モード切替トグル */}
            <div className="flex-shrink-0 flex bg-slate-100 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setInputMode("expense")}
                className={`px-2 py-1.5 text-[10px] font-medium rounded-md transition ${
                  inputMode === "expense"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                支出
              </button>
              <button
                type="button"
                onClick={() => setInputMode("income")}
                className={`px-2 py-1.5 text-[10px] font-medium rounded-md transition ${
                  inputMode === "income"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                収入
              </button>
              <button
                type="button"
                onClick={() => setInputMode("snapshot")}
                className={`px-2 py-1.5 text-[10px] font-medium rounded-md transition ${
                  inputMode === "snapshot"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                残高
              </button>
            </div>

            {/* 入力欄 */}
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
                  ? "〇〇 △△円"
                  : inputMode === "income"
                    ? "給与 〇〇円"
                    : "残高を入力"
              }
              disabled={isLoading || !selectedCircleId}
              className="flex-1 min-w-0 bg-slate-100 border border-slate-200 rounded-full px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 disabled:opacity-50"
            />

            {/* ペーストボタン */}
            <button
              type="button"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (text) {
                    setInput((prev) => prev + text);
                    inputRef.current?.focus();
                  }
                } catch {
                  // クリップボードへのアクセスが拒否された場合は何もしない
                }
              }}
              disabled={isLoading || !selectedCircleId}
              className="flex-shrink-0 bg-slate-200 text-slate-600 rounded-full p-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 active:bg-slate-300 transition-transform"
              title="クリップボードから貼り付け"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={isLoading || !input.trim() || !selectedCircleId}
              className="flex-shrink-0 bg-slate-900 text-white rounded-full px-3 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
            >
              {isLoading ? "..." : "送信"}
            </button>
          </div>
        </form>

        {/* iPhoneセーフエリア用スペース */}
        <div className="h-6" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }} />
      </div>

      {/* サークル追加モーダル */}
      {isCircleModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              新しいサークルを作成
            </h3>
            <input
              type="text"
              value={newCircleName}
              onChange={(e) => setNewCircleName(e.target.value)}
              placeholder="サークル名を入力"
              className="w-full bg-slate-100 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCircleModalOpen(false);
                  setNewCircleName("");
                }}
                className="flex-1 bg-slate-100 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleCreateCircle}
                disabled={!newCircleName.trim() || isCreatingCircle}
                className="flex-1 bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {isCreatingCircle ? "作成中..." : "作成"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
