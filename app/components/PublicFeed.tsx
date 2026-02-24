"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { getCategoryEmoji } from "@/lib/expenseParser";
import { getAvatarColor, getAvatarInitial } from "@/lib/avatar";
import type {
  ExpenseCategory,
  ReactionType,
} from "@/app/generated/prisma/enums";

type ReactionData = {
  counts: Record<ReactionType, number>;
  userReactions: ReactionType[];
};

type FeedItem = {
  id: string;
  kind: "snapshot" | "expense" | "income";
  circleId: string;
  circleName: string;
  userId: string;
  userName: string;
  userImage: string | null;
  amount: number;
  circleBalanceAfter?: number;
  snapshotDiff?: number | null;
  description?: string;
  place?: string | null;
  source?: string | null;
  category?: string;
  tags?: string[];
  note?: string | null;
  createdAt: string;
};

type Props = {
  circle: {
    id: string;
    name: string;
    currentBalance: number;
  };
  feed: FeedItem[];
  initialBalance: number;
  isLoggedIn: boolean;
  currentUserId: string | null;
};

function formatYen(amount: number) {
  return new Intl.NumberFormat("ja-JP").format(Math.abs(amount));
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

// フィード全体の circleBalanceAfter を再計算する
function recalcBalanceAfter(
  feed: FeedItem[],
  startBalance: number,
): FeedItem[] {
  let running = startBalance;
  return feed.map((item) => {
    if (item.kind === "snapshot") {
      running = item.amount;
    } else if (item.kind === "expense") {
      running += item.amount; // amount is already negative for expenses
    } else if (item.kind === "income") {
      running += item.amount;
    }
    return { ...item, circleBalanceAfter: running };
  });
}

export default function PublicFeed({
  circle,
  feed: initialFeed,
  initialBalance,
  isLoggedIn,
  currentUserId,
}: Props) {
  const [localFeed, setLocalFeed] = useState<FeedItem[]>(initialFeed);
  const [currentInitialBalance, setCurrentInitialBalance] =
    useState(initialBalance);
  const [reactions, setReactions] = useState<Record<string, ReactionData>>({});
  const [reactionsLoading, setReactionsLoading] = useState(false);
  const [togglingReaction, setTogglingReaction] = useState<string | null>(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 特定のアイテムのリアクションを取得
  const fetchReactionsForItems = useCallback(async (items: FeedItem[]) => {
    const targetItems = items.filter(
      (item) =>
        item.kind === "expense" ||
        item.kind === "income" ||
        item.kind === "snapshot",
    );
    if (targetItems.length === 0) return;

    const targets = targetItems
      .map((item) => `${item.kind}:${item.id.replace(`${item.kind}-`, "")}`)
      .join(",");

    try {
      const res = await fetch(
        `/api/reactions?targets=${encodeURIComponent(targets)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setReactions((prev) => ({ ...prev, ...(data.reactions || {}) }));
      }
    } catch (err) {
      console.error("Failed to fetch reactions:", err);
    }
  }, []);

  // 過去の実績を取得
  const loadHistory = useCallback(async () => {
    if (isLoadingHistory) return;

    // 現在の最古のアイテムを取得
    const oldestItem =
      localFeed.length > 0
        ? localFeed.reduce((oldest, item) =>
            new Date(item.createdAt) < new Date(oldest.createdAt)
              ? item
              : oldest,
          )
        : null;

    const beforeTimestamp = oldestItem
      ? new Date(oldestItem.createdAt).toISOString()
      : new Date().toISOString();

    setIsLoadingHistory(true);

    try {
      const res = await fetch(
        `/api/feed/public?circleId=${circle.id}&before=${encodeURIComponent(beforeTimestamp)}&limit=20`,
      );
      if (res.ok) {
        const data = await res.json();
        const newItems = data.feed as FeedItem[];

        if (newItems.length > 0) {
          const newInitialBalance = data.initialBalance as number;
          // 重複を除外して追加し、残高を再計算
          setLocalFeed((prev) => {
            const existingIds = new Set(prev.map((item) => item.id));
            const uniqueNewItems = newItems.filter(
              (item) => !existingIds.has(item.id),
            );
            // 時系列順にソート（古い順）
            const merged = [...uniqueNewItems, ...prev].sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            );
            return recalcBalanceAfter(merged, newInitialBalance);
          });
          setCurrentInitialBalance(newInitialBalance);
          // 新しいアイテムのリアクションを取得
          fetchReactionsForItems(newItems);
        }

        setHasMoreHistory(data.hasMore);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [circle.id, localFeed, isLoadingHistory, fetchReactionsForItems]);

  // リアクションを取得（初回ロード用）
  const fetchReactions = useCallback(async () => {
    const targetItems = localFeed.filter(
      (item) =>
        item.kind === "expense" ||
        item.kind === "income" ||
        item.kind === "snapshot",
    );
    if (targetItems.length === 0) return;

    const targets = targetItems
      .map((item) => `${item.kind}:${item.id.replace(`${item.kind}-`, "")}`)
      .join(",");

    setReactionsLoading(true);
    try {
      const res = await fetch(
        `/api/reactions?targets=${encodeURIComponent(targets)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setReactions(data.reactions || {});
      }
    } catch (err) {
      console.error("Failed to fetch reactions:", err);
    } finally {
      setReactionsLoading(false);
    }
  }, [localFeed]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  // リアクションをトグル（ログイン時のみ）
  const toggleReaction = async (item: FeedItem, reactionType: ReactionType) => {
    if (!isLoggedIn) return;

    const itemKey = `${item.kind}:${item.id.replace(`${item.kind}-`, "")}`;
    const toggleKey = `${item.id}:${reactionType}`;
    if (togglingReaction) return;

    setTogglingReaction(toggleKey);

    const currentReaction = reactions[itemKey];
    const hasReaction = currentReaction?.userReactions.includes(reactionType);

    try {
      if (hasReaction) {
        const res = await fetch("/api/reactions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetType: item.kind,
            targetId: item.id.replace(`${item.kind}-`, ""),
            type: reactionType,
          }),
        });
        if (res.ok) {
          setReactions((prev) => {
            const updated = { ...prev };
            if (updated[itemKey]) {
              updated[itemKey] = {
                counts: {
                  ...updated[itemKey].counts,
                  [reactionType]: Math.max(
                    0,
                    updated[itemKey].counts[reactionType] - 1,
                  ),
                },
                userReactions: updated[itemKey].userReactions.filter(
                  (r) => r !== reactionType,
                ),
              };
            }
            return updated;
          });
        }
      } else {
        const res = await fetch("/api/reactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetType: item.kind,
            targetId: item.id.replace(`${item.kind}-`, ""),
            type: reactionType,
          }),
        });
        if (res.ok) {
          setReactions((prev) => {
            const updated = { ...prev };
            if (!updated[itemKey]) {
              updated[itemKey] = {
                counts: { CHECK: 0, GOOD: 0, BAD: 0, DOGEZA: 0 },
                userReactions: [],
              };
            }
            updated[itemKey] = {
              counts: {
                ...updated[itemKey].counts,
                [reactionType]: updated[itemKey].counts[reactionType] + 1,
              },
              userReactions: [...updated[itemKey].userReactions, reactionType],
            };
            return updated;
          });
        }
      }
    } catch (err) {
      console.error("Failed to toggle reaction:", err);
    } finally {
      setTogglingReaction(null);
    }
  };

  // 日付ごとにグループ化
  const groupedByDate = localFeed.reduce<Record<string, FeedItem[]>>(
    (acc, item) => {
      const dateKey = formatDate(item.createdAt);
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(item);
      return acc;
    },
    {},
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* 残高ヘッダー */}
      <div className="flex-shrink-0 bg-sky-100 px-4 py-3">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-sm text-slate-500">{circle.name}</span>
        </div>
        <div className="flex items-center justify-center">
          <span className="font-semibold text-slate-900 text-2xl">
            ¥{formatYen(circle.currentBalance)}
          </span>
        </div>
      </div>

      {/* フィード表示 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-4 bg-slate-50 min-h-0"
      >
        {/* 以前の実績を取得ボタン */}
        {hasMoreHistory && (
          <div className="flex justify-center mb-4">
            <button
              type="button"
              onClick={loadHistory}
              disabled={isLoadingHistory}
              className="text-xs text-slate-600 bg-white px-4 py-2 rounded-full border border-slate-300 hover:bg-slate-100 transition disabled:opacity-50"
            >
              {isLoadingHistory ? "読み込み中..." : "以前の実績を取得"}
            </button>
          </div>
        )}

        {Object.entries(groupedByDate).map(([date, items]) => (
          <div key={date}>
            {/* 日付ヘッダー */}
            <div className="flex justify-center mb-3">
              <span className="text-xs text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                {date}
              </span>
            </div>

            {/* アイテム */}
            <div className="space-y-2">
              {items.map((item, idx) => {
                const prevItem = idx > 0 ? items[idx - 1] : null;
                const isSameUserAsPrev =
                  prevItem && prevItem.userId === item.userId;
                const isOwnMessage = item.userId === currentUserId;
                const itemKey = `${item.kind}:${item.id.replace(`${item.kind}-`, "")}`;
                const reactionData = reactions[itemKey];

                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-2 ${isOwnMessage ? "flex-row-reverse" : ""}`}
                  >
                    {/* ユーザーアイコン（連続投稿時は非表示） */}
                    {isSameUserAsPrev ? (
                      <div className="w-8 flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                        {item.userImage ? (
                          <Image
                            src={item.userImage}
                            alt={item.userName}
                            width={32}
                            height={32}
                            className="w-8 h-8 object-cover"
                          />
                        ) : (
                          <div
                            className="w-8 h-8 flex items-center justify-center text-xs text-white font-medium"
                            style={{
                              backgroundColor: getAvatarColor(item.userId),
                            }}
                          >
                            {getAvatarInitial(item.userName)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* メッセージ部分 */}
                    <div
                      className={`max-w-[70%] ${isOwnMessage ? "items-end" : ""}`}
                    >
                      {/* 投稿者名（バブルの上、連続投稿時は非表示） */}
                      {!isSameUserAsPrev && (
                        <div
                          className={`text-[10px] text-slate-500 mb-0.5 ${
                            isOwnMessage ? "text-right" : ""
                          }`}
                        >
                          {item.userName}
                        </div>
                      )}

                      {/* メッセージバブル */}
                      <div
                        className={`rounded-2xl px-3 py-1.5 text-left ${
                          isOwnMessage
                            ? "bg-slate-900 text-white rounded-tr-sm"
                            : "bg-white border border-slate-200 rounded-tl-sm"
                        }`}
                      >
                        {/* 時刻（バブル内上部） */}
                        <div className="flex items-center gap-2 mb-1">
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
                            {/* カテゴリ絵文字 + 金額 + 残高 + タグバッジ */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm">
                                {getCategoryEmoji(
                                  (item.category || "OTHER") as ExpenseCategory,
                                )}
                              </span>
                              <span
                                className={`font-semibold text-sm ${
                                  isOwnMessage ? "text-red-300" : "text-red-600"
                                }`}
                              >
                                ¥{formatYen(item.amount)}
                              </span>
                              {item.circleBalanceAfter !== undefined && (
                                <span
                                  className={`text-xs ${
                                    isOwnMessage
                                      ? "text-slate-400"
                                      : "text-slate-500"
                                  }`}
                                >
                                  (¥{formatYen(item.circleBalanceAfter)})
                                </span>
                              )}
                              {item.tags && item.tags.length > 0 && (
                                <>
                                  {item.tags.map((tag, tagIdx) => (
                                    <span
                                      key={tagIdx}
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
                                  isOwnMessage
                                    ? "text-emerald-300"
                                    : "text-emerald-600"
                                }`}
                              >
                                +¥{formatYen(item.amount)}
                              </span>
                              {item.tags && item.tags.length > 0 && (
                                <>
                                  {item.tags.map((tag, tagIdx) => (
                                    <span
                                      key={tagIdx}
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
                        ) : (
                          <>
                            {/* 残高スナップショット */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`font-semibold text-sm ${
                                  isOwnMessage ? "text-white" : "text-slate-900"
                                }`}
                              >
                                ¥{formatYen(item.amount)}
                              </span>
                              {item.snapshotDiff !== undefined && (
                                <span
                                  className={`text-xs ${
                                    isOwnMessage
                                      ? "text-slate-400"
                                      : "text-slate-500"
                                  }`}
                                >
                                  {item.snapshotDiff === null
                                    ? "(-)"
                                    : item.snapshotDiff >= 0
                                      ? `(+¥${formatYen(item.snapshotDiff)})`
                                      : `(-¥${formatYen(Math.abs(item.snapshotDiff))})`}
                                </span>
                              )}
                            </div>
                            {item.note && (
                              <p
                                className={`text-[10px] mt-0.5 ${
                                  isOwnMessage
                                    ? "text-slate-300"
                                    : "text-slate-600"
                                }`}
                              >
                                {item.note}
                              </p>
                            )}
                          </>
                        )}
                      </div>

                      {/* リアクションボタン */}
                      <div
                        className={`flex items-center gap-1 mt-1 ${
                          isOwnMessage ? "justify-end" : "justify-start"
                        }`}
                      >
                        {(
                          ["CHECK", "GOOD", "BAD", "DOGEZA"] as ReactionType[]
                        ).map((type) => {
                          const count = reactionData?.counts[type] || 0;
                          const hasReacted =
                            reactionData?.userReactions.includes(type);
                          const isToggling =
                            togglingReaction === `${item.id}:${type}`;
                          const emoji =
                            type === "CHECK"
                              ? "✅"
                              : type === "GOOD"
                                ? "👍"
                                : type === "BAD"
                                  ? "👎"
                                  : "🙇";

                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => toggleReaction(item, type)}
                              disabled={
                                !isLoggedIn ||
                                reactionsLoading ||
                                !!togglingReaction
                              }
                              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition ${
                                hasReacted
                                  ? "bg-slate-700 text-white"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              } ${reactionsLoading || isToggling ? "opacity-50" : ""} ${
                                !isLoggedIn ? "cursor-default" : ""
                              }`}
                            >
                              <span className="text-[11px]">{emoji}</span>
                              {count > 0 && (
                                <span className="text-[10px] min-w-[12px] text-center">
                                  {count}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {localFeed.length === 0 && (
          <div className="text-center text-slate-500 mt-8">
            <p className="mb-2">まだ記録がありません</p>
          </div>
        )}
      </div>

      {/* 未ログイン時のログイン促進バナー */}
      {!isLoggedIn && (
        <div className="flex-shrink-0 bg-white border-t border-slate-200 p-3">
          <Link
            href="/"
            className="block w-full text-center bg-slate-900 text-white rounded-lg py-2.5 text-sm font-medium"
          >
            ログインしてリアクションする
          </Link>
        </div>
      )}
    </div>
  );
}
