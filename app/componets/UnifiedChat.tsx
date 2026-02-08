"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { getCategoryEmoji } from "@/lib/expenseParser";
import { getAvatarColor, getAvatarInitial } from "@/lib/avatar";
import type { ExpenseCategory, ReactionType } from "@/app/generated/prisma/enums";

type ReactionData = {
  counts: Record<ReactionType, number>;
  userReactions: ReactionType[];
};

type TagSummaryData = {
  circleName: string;
  tag: string;
  total: number;
  count: number;
};

type ShortcutItem = {
  command: string;
  aliases: string[];
  description: string;
};

type FeedItem = {
  id: string;
  kind: "snapshot" | "expense" | "income" | "summary" | "invite" | "help";
  circleId: string;
  circleName?: string;
  userId: string;
  userName: string;
  userImage: string | null;
  amount: number;
  circleBalanceAfter?: number; // この操作後のサークル残高
  snapshotDiff?: number | null; // 前回残高との差分（null = 初回）
  description?: string;
  place?: string | null;
  source?: string | null;
  category?: string;
  tags?: string[];
  note?: string | null;
  summaryData?: TagSummaryData[]; // 後方互換性のため
  allTimeSummaryData?: TagSummaryData[];
  monthlySummaryData?: TagSummaryData[];
  inviteUrl?: string;
  shortcuts?: ShortcutItem[];
  createdAt: string;
};

type Circle = {
  id: string;
  name: string;
  adminName: string;
};

type CircleBalance = {
  circleId: string;
  circleName: string;
  balance: number;
  monthlyExpense: number;
  allTimeExpense: number;
};

type UserRole = {
  circleId: string;
  role: string;
};

type TagSummaryItem = {
  circleId: string;
  circleName: string;
  tag: string;
  total: number;
  count: number;
};

type Props = {
  initialFeed: FeedItem[];
  circles: Circle[];
  circleBalances: CircleBalance[];
  currentUserId: string;
  userRoles: UserRole[];
  tagSummary: TagSummaryItem[];
  initialTotalBalance: number;
  initialMonthlyExpense: number;
  initialDailyExpense: number;
  adminCircleIds: string[];
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

// localStorageが利用可能かテスト（Safariプライベートモード対策）
function isLocalStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const testKey = "__storage_test__";
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

// ローカルストレージから直近タグを取得
function getRecentTags(): string[] {
  if (!isLocalStorageAvailable()) return [];
  try {
    const stored = localStorage.getItem(RECENT_TAGS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    // 配列でない場合は空配列を返す
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.warn("Failed to get recent tags:", e);
    return [];
  }
}

// ローカルストレージに直近タグを保存
function saveRecentTags(tags: string[]): boolean {
  if (!isLocalStorageAvailable()) return false;
  try {
    localStorage.setItem(RECENT_TAGS_KEY, JSON.stringify(tags));
    return true;
  } catch (e) {
    console.warn("Failed to save recent tags:", e);
    return false;
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

export default function UnifiedChat({ initialFeed, circles, circleBalances, currentUserId, userRoles, tagSummary, initialTotalBalance, initialMonthlyExpense, initialDailyExpense, adminCircleIds }: Props) {
  const [feed, setFeed] = useState<FeedItem[]>(initialFeed);
  const [balances, setBalances] = useState<CircleBalance[]>(circleBalances);
  const [totalBalance, setTotalBalance] = useState<number>(initialTotalBalance);
  const [monthlyExpense, setMonthlyExpense] = useState<number>(initialMonthlyExpense);
  const [dailyExpense, setDailyExpense] = useState<number>(initialDailyExpense);
  const [selectedCircleId, setSelectedCircleId] = useState<string>(circles[0]?.id || "");
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [filterCircleId, setFilterCircleId] = useState<string>(""); // "" = すべて表示
  const [inputMode, setInputMode] = useState<InputMode>("expense");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentTags, setRecentTags] = useState<string[]>([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isCircleModalOpen, setIsCircleModalOpen] = useState(false);
  const [newCircleName, setNewCircleName] = useState("");
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingCircle, setIsCreatingCircle] = useState(false);
  const [reactions, setReactions] = useState<Record<string, ReactionData>>({});
  const [reactionsLoading, setReactionsLoading] = useState(false);
  const [togglingReaction, setTogglingReaction] = useState<string | null>(null); // "itemId:type"
  const [hasMoreHistory, setHasMoreHistory] = useState<Record<string, boolean>>({}); // circleId -> hasMore
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCircle = circles.find((c) => c.id === selectedCircleId);

  // ユーザーがサークルの編集権限を持っているかチェック
  const canEditCircle = (circleId: string) => {
    const role = userRoles.find((r) => r.circleId === circleId)?.role;
    return role === "ADMIN" || role === "EDITOR";
  };

  // リアクションを取得（遅延読み込み）
  const fetchReactions = useCallback(async (items: FeedItem[]) => {
    // expense, income, snapshot のみ対象
    const targetItems = items.filter(
      (item) => item.kind === "expense" || item.kind === "income" || item.kind === "snapshot"
    );
    if (targetItems.length === 0) return;

    const targets = targetItems
      .map((item) => `${item.kind}:${item.id.replace(`${item.kind}-`, "")}`)
      .join(",");

    setReactionsLoading(true);
    try {
      const res = await fetch(`/api/reactions?targets=${encodeURIComponent(targets)}`);
      if (res.ok) {
        const data = await res.json();
        setReactions(data.reactions || {});
      }
    } catch (err) {
      console.error("Failed to fetch reactions:", err);
    } finally {
      setReactionsLoading(false);
    }
  }, []);

  // 過去の実績を取得
  const loadHistory = useCallback(async (circleId: string) => {
    if (isLoadingHistory) return;

    // そのサークルの現在の最古のアイテムを取得
    const circleItems = feed.filter((item) => item.circleId === circleId);
    const oldestItem = circleItems.length > 0
      ? circleItems.reduce((oldest, item) =>
          new Date(item.createdAt) < new Date(oldest.createdAt) ? item : oldest
        )
      : null;

    setIsLoadingHistory(true);
    try {
      const params = new URLSearchParams({ circleId });
      if (oldestItem) {
        params.set("before", oldestItem.createdAt);
      }

      const res = await fetch(`/api/feed/history?${params}`);
      if (res.ok) {
        const data = await res.json();
        // 重複を避けて古いアイテムを先頭に追加
        const existingIds = new Set(feed.map((item) => item.id));
        const newItems = data.feed.filter((item: FeedItem) => !existingIds.has(item.id));

        if (newItems.length > 0) {
          setFeed((prev) => [...newItems, ...prev].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          ));
          // 新しいアイテムのリアクションを取得
          fetchReactions(newItems);
        }

        // hasMoreを更新
        setHasMoreHistory((prev) => ({
          ...prev,
          [circleId]: data.hasMore,
        }));
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [feed, isLoadingHistory, fetchReactions]);

  // リアクションをトグル
  const toggleReaction = async (item: FeedItem, reactionType: ReactionType) => {
    const itemKey = `${item.kind}:${item.id.replace(`${item.kind}-`, "")}`;
    const toggleKey = `${item.id}:${reactionType}`;
    if (togglingReaction) return; // 処理中は無視

    setTogglingReaction(toggleKey);

    const currentReaction = reactions[itemKey];
    const hasReaction = currentReaction?.userReactions.includes(reactionType);

    try {
      if (hasReaction) {
        // 削除
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
                  [reactionType]: Math.max(0, updated[itemKey].counts[reactionType] - 1),
                },
                userReactions: updated[itemKey].userReactions.filter((r) => r !== reactionType),
              };
            }
            return updated;
          });
        }
      } else {
        // 追加
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

  // アイテム削除処理
  const handleDeleteItem = async (item: FeedItem) => {
    if (!canEditCircle(item.circleId)) return;

    setIsDeleting(true);
    try {
      const kind = item.kind;
      const id = item.id.replace(`${kind}-`, "");

      const res = await fetch(`/api/${kind}/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // フィードから削除
        setFeed((prev) => prev.filter((f) => f.id !== item.id));

        // 残高を更新
        if (kind === "expense") {
          // 支出を削除 → 残高を戻す（プラス）、当月支出を減らす
          const expenseAmount = Math.abs(item.amount);
          setBalances((prev) =>
            prev.map((cb) =>
              cb.circleId === item.circleId
                ? {
                    ...cb,
                    balance: cb.balance + expenseAmount,
                    monthlyExpense: cb.monthlyExpense - expenseAmount,
                  }
                : cb
            )
          );
          // ADMINサークルの場合、合計残高と当月支出も更新
          if (adminCircleIds.includes(item.circleId)) {
            setTotalBalance((prev) => prev + expenseAmount);
            setMonthlyExpense((prev) => prev - expenseAmount);
            // 当日の支出だった場合は当日支出も減算
            const itemDate = new Date(item.createdAt);
            const today = new Date();
            if (
              itemDate.getFullYear() === today.getFullYear() &&
              itemDate.getMonth() === today.getMonth() &&
              itemDate.getDate() === today.getDate()
            ) {
              setDailyExpense((prev) => prev - expenseAmount);
            }
          }
        } else if (kind === "income") {
          // 収入を削除 → 残高を戻す（マイナス）
          setBalances((prev) =>
            prev.map((cb) =>
              cb.circleId === item.circleId
                ? { ...cb, balance: cb.balance - item.amount }
                : cb
            )
          );
          // ADMINサークルの場合、合計残高も更新
          if (adminCircleIds.includes(item.circleId)) {
            setTotalBalance((prev) => prev - item.amount);
          }
        }
        // snapshotの場合は複雑なので残高の再計算はページリロードで対応

        setSelectedItem(null);
      } else {
        const data = await res.json();
        setError(data.error || "削除に失敗しました");
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setIsDeleting(false);
    }
  };

  // 初期読み込み時に直近タグを取得
  useEffect(() => {
    setRecentTags(getRecentTags());
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [feed]);

  // サークル切り替え時に一番下にスクロール + 一時的なアイテムを削除
  useEffect(() => {
    // 集計・ヘルプ・招待などの一時的なアイテムを削除
    setFeed((prev) => prev.filter((item) =>
      item.kind !== "summary" && item.kind !== "help" && item.kind !== "invite"
    ));
    // 少し遅延してスクロール（フィルタリング後のレンダリングを待つ）
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 50);
  }, [selectedCircleId, filterCircleId]);

  // リアクションを遅延読み込み
  useEffect(() => {
    fetchReactions(feed);
  }, [feed, fetchReactions]);

  // 招待コマンドかどうかをチェック
  const isInviteCommand = (text: string) => {
    const normalized = text.trim().toLowerCase();
    return normalized === "招待" || normalized === "しょうたい" || normalized === "invite";
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

  // ヘルプコマンドかどうかをチェック
  const isHelpCommand = (text: string) => {
    const normalized = text.trim().toLowerCase();
    return (
      normalized === "?" ||
      normalized === "？" ||
      normalized === "ショート" ||
      normalized === "しょーと" ||
      normalized === "しょーとかっと" ||
      normalized === "ショートカット" ||
      normalized === "help" ||
      normalized === "ヘルプ"
    );
  };

  // ショートカット一覧データ
  const shortcutList: ShortcutItem[] = [
    {
      command: "招待",
      aliases: ["しょうたい", "invite"],
      description: "招待リンクを生成してコピー",
    },
    {
      command: "集計",
      aliases: ["し", "しゅうけい"],
      description: "今月のタグ別集計を表示",
    },
    {
      command: "サークル追加",
      aliases: ["さーくるついか", "さつ", "ca", "circleadd"],
      description: "新しいサークルを作成",
    },
    {
      command: "?",
      aliases: ["？", "ショートカット", "しょーと", "help"],
      description: "この一覧を表示",
    },
  ];

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
      const res = await fetch("/api/circles", {
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

    // 集計コマンドの処理（タグ別集計を表示）
    if (isSummaryCommand(input)) {
      setInput("");
      setIsLoading(true);
      try {
        const res = await fetch(`/api/summary?circleId=${encodeURIComponent(selectedCircleId)}`);
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
            allTimeSummaryData: data.allTimeSummary,
            monthlySummaryData: data.monthlySummary,
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

    // ヘルプコマンドの処理（ショートカット一覧を表示）
    if (isHelpCommand(input)) {
      const helpItem: FeedItem = {
        id: `help-${Date.now()}`,
        kind: "help",
        circleId: selectedCircleId,
        userId: currentUserId,
        userName: "自分",
        userImage: null,
        amount: 0,
        shortcuts: shortcutList,
        createdAt: new Date().toISOString(),
      };
      setFeed((prev) => [...prev, helpItem]);
      setInput("");
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

        // 支出後のサークル残高を計算
        const currentCircleBalance = balances.find((cb) => cb.circleId === selectedCircleId)?.balance || 0;
        const newCircleBalance = currentCircleBalance - data.expense.amount;

        const newItem: FeedItem = {
          id: `expense-${data.expense.id}`,
          kind: "expense",
          circleId: data.expense.circleId,
          circleName: selectedCircle?.name,
          userId: currentUserId,
          userName: data.expense.user.name || "自分",
          userImage: data.expense.user.image,
          amount: -data.expense.amount,
          circleBalanceAfter: newCircleBalance,
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

        // 一時的なアイテム（集計・ヘルプ・招待）を削除して新しいアイテムを追加
        setFeed((prev) => [
          ...prev.filter((item) =>
            item.kind !== "summary" && item.kind !== "help" && item.kind !== "invite"
          ),
          newItem,
        ]);

        // サークル残高と当月支出を更新（支出なので引く）
        setBalances((prev) =>
          prev.map((cb) =>
            cb.circleId === selectedCircleId
              ? {
                  ...cb,
                  balance: cb.balance - data.expense.amount,
                  monthlyExpense: cb.monthlyExpense + data.expense.amount,
                }
              : cb
          )
        );

        // ADMINサークルの場合、合計残高と当月支出・当日支出も更新
        if (adminCircleIds.includes(selectedCircleId)) {
          setTotalBalance((prev) => prev - data.expense.amount);
          setMonthlyExpense((prev) => prev + data.expense.amount);
          setDailyExpense((prev) => prev + data.expense.amount);
        }
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

        // 一時的なアイテム（集計・ヘルプ・招待）を削除して新しいアイテムを追加
        setFeed((prev) => [
          ...prev.filter((item) =>
            item.kind !== "summary" && item.kind !== "help" && item.kind !== "invite"
          ),
          newItem,
        ]);

        // サークル残高を更新（収入なので足す）
        setBalances((prev) =>
          prev.map((cb) =>
            cb.circleId === selectedCircleId
              ? { ...cb, balance: cb.balance + data.income.amount }
              : cb
          )
        );

        // ADMINサークルの場合、合計残高も更新
        if (adminCircleIds.includes(selectedCircleId)) {
          setTotalBalance((prev) => prev + data.income.amount);
        }
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

        // サーバーから返された差分を使用（IDはAPIが既にプレフィックス付きで返す）
        const newSnapshotItem: FeedItem = {
          id: data.snapshot.id,
          kind: "snapshot",
          circleId: selectedCircleId,
          circleName: selectedCircle?.name,
          userId: currentUserId,
          userName: "自分",
          userImage: null,
          amount: amount,
          snapshotDiff: data.snapshot.snapshotDiff,
          note: data.snapshot.note,
          createdAt: new Date().toISOString(),
        };

        // 一時的なアイテム（集計・ヘルプ・招待）を削除して新しいアイテムを追加
        setFeed((prev) => [
          ...prev.filter((item) =>
            item.kind !== "summary" && item.kind !== "help" && item.kind !== "invite"
          ),
          newSnapshotItem,
        ]);

        // 旧残高を取得
        const oldBalance = balances.find((cb) => cb.circleId === selectedCircleId)?.balance || 0;
        const balanceDiff = amount - oldBalance;

        // サークル残高を新しい残高に更新
        setBalances((prev) =>
          prev.map((cb) =>
            cb.circleId === selectedCircleId
              ? { ...cb, balance: amount }
              : cb
          )
        );

        // ADMINサークルの場合、合計残高も更新
        if (adminCircleIds.includes(selectedCircleId)) {
          setTotalBalance((prev) => prev + balanceDiff);
        }
      }

      setInput("");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // フィルタリング（filterCircleIdが空の場合はすべて表示）
  const filteredFeed = filterCircleId
    ? feed.filter((item) => item.circleId === filterCircleId)
    : feed;

  // 日付でグループ化
  const groupedFeed = filteredFeed.reduce(
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
      {/* 合計残高ヘッダー */}
      <div className="flex-shrink-0 bg-sky-100 px-3 py-1.5 border-b border-sky-200">
          <div className="flex items-center justify-between gap-2">
            {/* 残高 */}
            <div className="flex flex-col items-center flex-1">
              <span className="text-[10px] text-slate-500">残高</span>
              <span className="font-semibold text-slate-900 text-lg">
                ¥{formatYen(totalBalance)}
              </span>
            </div>
            {/* 当月支出 */}
            <div className="flex flex-col items-center flex-1">
              <span className="text-[10px] text-slate-500">当月支出</span>
              <span className="font-semibold text-red-500 text-lg">
                ¥{formatYen(monthlyExpense)}
              </span>
            </div>
            {/* 当日支出 */}
            <div className="flex flex-col items-center flex-1">
              <span className="text-[10px] text-slate-500">当日支出</span>
              <span className="font-semibold text-red-500 text-lg">
                ¥{formatYen(dailyExpense)}
              </span>
            </div>
            {/* 内訳ボタン */}
            {balances.length > 0 && (
              <button
                type="button"
                onClick={() => setIsBreakdownOpen(!isBreakdownOpen)}
                className="text-[10px] text-slate-500 hover:text-slate-700 px-2 py-0.5 rounded border border-slate-300 hover:border-slate-400 transition"
              >
                内訳
              </button>
            )}
          </div>

          {/* サークル別残高（内訳） */}
          {isBreakdownOpen && balances.length > 0 && (() => {
            const adminBalances = balances.filter((cb) => adminCircleIds.includes(cb.circleId));
            const invitedBalances = balances.filter((cb) => !adminCircleIds.includes(cb.circleId));

            return (
              <div className="mt-2 bg-slate-100 rounded-lg p-2 relative">
                {/* 閉じるボタン */}
                <button
                  type="button"
                  onClick={() => setIsBreakdownOpen(false)}
                  className="absolute top-1 right-1 text-slate-400 hover:text-slate-600 p-1"
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
                  {/* ヘッダー */}
                  <div className="flex items-center text-[10px] text-slate-500 gap-2 pb-1 border-b border-slate-300">
                    <span className="flex-1"></span>
                    <span className="whitespace-nowrap">残高</span>
                    <span className="whitespace-nowrap w-16 text-right">全期間</span>
                    <span className="whitespace-nowrap w-16 text-right">今月</span>
                  </div>

                  {/* ADMINサークル（合計に含まれる） */}
                  {adminBalances.map((cb) => (
                    <div
                      key={cb.circleId}
                      className="flex items-center text-xs gap-2"
                    >
                      <span className="text-slate-600 truncate flex-1">
                        {cb.circleName}
                      </span>
                      <span
                        className={`font-medium whitespace-nowrap ${
                          cb.balance < 0 ? "text-red-500" : "text-slate-900"
                        }`}
                      >
                        ¥{formatYen(cb.balance)}
                      </span>
                      <span className="text-red-500 whitespace-nowrap w-16 text-right">
                        -¥{formatYen(cb.allTimeExpense)}
                      </span>
                      <span className="text-red-500 whitespace-nowrap w-16 text-right">
                        -¥{formatYen(cb.monthlyExpense)}
                      </span>
                    </div>
                  ))}

                  {/* 招待されたサークル（合計に含まれない） */}
                  {invitedBalances.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 pt-1">
                        <div className="flex-1 border-t border-slate-300" />
                        <span className="text-[10px] text-slate-500 whitespace-nowrap">
                          招待されたサークル
                        </span>
                        <div className="flex-1 border-t border-slate-300" />
                      </div>
                      {invitedBalances.map((cb) => (
                        <div
                          key={cb.circleId}
                          className="flex items-center text-xs gap-2"
                        >
                          <span className="text-slate-500 truncate flex-1">
                            {cb.circleName}
                          </span>
                          <span
                            className={`font-medium whitespace-nowrap ${
                              cb.balance < 0 ? "text-red-500" : "text-slate-600"
                            }`}
                          >
                            ¥{formatYen(cb.balance)}
                          </span>
                          <span className="text-red-400/70 whitespace-nowrap w-16 text-right">
                            -¥{formatYen(cb.allTimeExpense)}
                          </span>
                          <span className="text-red-400/70 whitespace-nowrap w-16 text-right">
                            -¥{formatYen(cb.monthlyExpense)}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            );
          })()}
      </div>

      {/* フィード表示 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-1 space-y-1 bg-slate-50 min-h-0"
      >
        {/* 以前の実績を取得ボタン（特定ウォレット表示時のみ） */}
        {filterCircleId && hasMoreHistory[filterCircleId] !== false && (
          <div className="flex justify-center mb-4">
            <button
              type="button"
              onClick={() => loadHistory(filterCircleId)}
              disabled={isLoadingHistory}
              className="text-xs text-slate-600 bg-white px-4 py-2 rounded-full border border-slate-300 hover:bg-slate-100 transition disabled:opacity-50"
            >
              {isLoadingHistory ? "読み込み中..." : "以前の実績を取得"}
            </button>
          </div>
        )}

        {filteredFeed.length === 0 ? (
          <div className="text-center text-slate-500 mt-8">
            <p className="mb-2">まだ記録がありません</p>
            <p className="text-sm">支出や残高を入力してください</p>
          </div>
        ) : (
          Object.entries(groupedFeed).map(([date, items]) => (
            <div key={date}>
              {/* 日付ヘッダー */}
              <div className="flex justify-center mb-0.5">
                <span className="text-xs text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                  {date}
                </span>
              </div>

              {/* その日のアイテム */}
              <div className="space-y-0.5">
                {items.map((item, idx) => {
                  const isOwnMessage = item.userId === currentUserId;
                  const prevItem = idx > 0 ? items[idx - 1] : null;
                  const isSameUserAsPrev = prevItem && prevItem.userId === item.userId;

                  return (
                    <div
                      key={item.id}
                      className={`flex items-start gap-2 ${
                        isOwnMessage ? "flex-row-reverse" : ""
                      }`}
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
                              style={{ backgroundColor: getAvatarColor(item.userId) }}
                            >
                              {getAvatarInitial(item.userName)}
                            </div>
                          )}
                        </div>
                      )}

                      {/* メッセージ部分 */}
                      <div className={`max-w-[70%] ${isOwnMessage ? "items-end" : ""}`}>
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
                        <button
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          className={`rounded-2xl px-3 py-1.5 text-left w-full ${
                            isOwnMessage
                              ? "bg-slate-900 text-white rounded-tr-sm"
                              : "bg-white border border-slate-200 rounded-tl-sm"
                          } active:opacity-80 transition-opacity`}
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
                                {item.circleBalanceAfter !== undefined && (
                                  <span
                                    className={`text-xs ${
                                      isOwnMessage ? "text-slate-400" : "text-slate-500"
                                    }`}
                                  >
                                    (¥{formatYen(item.circleBalanceAfter)})
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
                              {/* 全期間集計 */}
                              <div className="text-xs font-medium mb-2">
                                📊 全期間のタグ別集計
                              </div>
                              {item.allTimeSummaryData && item.allTimeSummaryData.length > 0 ? (
                                <div className="space-y-1.5 mb-4">
                                  {item.allTimeSummaryData.map((s, idx) => (
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
                                  className={`text-[10px] mb-4 ${
                                    isOwnMessage ? "text-slate-400" : "text-slate-500"
                                  }`}
                                >
                                  タグ付き支出がありません
                                </div>
                              )}

                              {/* 今月分集計 */}
                              <div className="text-xs font-medium mb-2">
                                📅 今月のタグ別集計
                              </div>
                              {item.monthlySummaryData && item.monthlySummaryData.length > 0 ? (
                                <div className="space-y-1.5">
                                  {item.monthlySummaryData.map((s, idx) => (
                                    <div
                                      key={idx}
                                      className={`flex items-center justify-between text-xs ${
                                        isOwnMessage ? "text-slate-200" : "text-slate-700"
                                      }`}
                                    >
                                      <span
                                        className={`px-2 py-0.5 rounded-full ${
                                          isOwnMessage
                                            ? "bg-emerald-600 text-emerald-100"
                                            : "bg-emerald-100 text-emerald-700"
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
                          ) : item.kind === "help" ? (
                            <>
                              {/* ショートカット一覧 */}
                              <div className="text-xs font-medium mb-2">
                                📋 ショートカット一覧
                              </div>
                              {item.shortcuts && item.shortcuts.length > 0 && (
                                <div className="space-y-2">
                                  {item.shortcuts.map((shortcut, idx) => (
                                    <div
                                      key={idx}
                                      className={`text-xs ${
                                        isOwnMessage ? "text-slate-200" : "text-slate-700"
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                        <span
                                          className={`font-medium px-1.5 py-0.5 rounded ${
                                            isOwnMessage
                                              ? "bg-slate-600 text-slate-100"
                                              : "bg-slate-200 text-slate-800"
                                          }`}
                                        >
                                          {shortcut.command}
                                        </span>
                                        {shortcut.aliases.slice(0, 2).map((alias, aliasIdx) => (
                                          <span
                                            key={aliasIdx}
                                            className={`text-[10px] ${
                                              isOwnMessage ? "text-slate-400" : "text-slate-500"
                                            }`}
                                          >
                                            {alias}
                                          </span>
                                        ))}
                                      </div>
                                      <div
                                        className={`text-[10px] ${
                                          isOwnMessage ? "text-slate-400" : "text-slate-500"
                                        }`}
                                      >
                                        {shortcut.description}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
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
                                      isOwnMessage ? "text-slate-400" : "text-slate-500"
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
                                    isOwnMessage ? "text-slate-300" : "text-slate-600"
                                  }`}
                                >
                                  {item.note}
                                </p>
                              )}
                            </>
                          )}
                        </button>

                        {/* リアクションボタン（expense, income, snapshot のみ） */}
                        {(item.kind === "expense" || item.kind === "income" || item.kind === "snapshot") && (
                          <div
                            className={`flex items-center gap-1 mt-1 ${
                              isOwnMessage ? "justify-end" : "justify-start"
                            }`}
                          >
                            {(["CHECK", "GOOD", "BAD", "DOGEZA"] as ReactionType[]).map((type) => {
                              const itemKey = `${item.kind}:${item.id.replace(`${item.kind}-`, "")}`;
                              const reactionData = reactions[itemKey];
                              const count = reactionData?.counts[type] || 0;
                              const hasReacted = reactionData?.userReactions.includes(type);
                              const isToggling = togglingReaction === `${item.id}:${type}`;
                              const emoji = type === "CHECK" ? "✅" : type === "GOOD" ? "👍" : type === "BAD" ? "👎" : "🙇";

                              return (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleReaction(item, type);
                                  }}
                                  disabled={reactionsLoading || !!togglingReaction}
                                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition ${
                                    hasReacted
                                      ? "bg-slate-700 text-white"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  } ${(reactionsLoading || isToggling) ? "opacity-50" : ""}`}
                                >
                                  <span className="text-[11px]">{emoji}</span>
                                  {count > 0 && (
                                    <span className="text-[10px] min-w-[12px] text-center">{count}</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
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
      <div className="flex-shrink-0 bg-white border-t border-slate-200">
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
            onChange={(e) => {
              const value = e.target.value;
              setSelectedCircleId(value);
              setFilterCircleId(value); // 選択したらフィルタリングを有効化
            }}
            className="flex-1 min-w-0 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-slate-400"
          >
            {circles.map((circle) => (
              <option key={circle.id} value={circle.id}>
                {circle.name || "（名前なし）"}　{circle.adminName}
              </option>
            ))}
          </select>

          {/* 集計ボタン */}
          <Link
            href="/dashboard/analytics"
            className="flex-shrink-0 p-2.5 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300 active:scale-95 transition"
            title="集計"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="M18 17V9" />
              <path d="M13 17V5" />
              <path d="M8 17v-3" />
            </svg>
          </Link>

          {/* 更新ボタン */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex-shrink-0 p-2.5 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300 active:scale-95 transition"
            title="更新"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
          </button>

          {/* 設定ボタン */}
          <Link
            href="/dashboard/settings"
            className="flex-shrink-0 p-2.5 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300 active:scale-95 transition"
            title="設定"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </Link>
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
        <div className="h-2" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }} />
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

      {/* 詳細モーダル */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {selectedItem.kind === "expense"
                ? "支出詳細"
                : selectedItem.kind === "income"
                  ? "収入詳細"
                  : "残高詳細"}
            </h3>

            <div className="space-y-3">
              {/* 金額 */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">金額</span>
                <span
                  className={`text-lg font-semibold ${
                    selectedItem.kind === "expense"
                      ? "text-red-600"
                      : selectedItem.kind === "income"
                        ? "text-emerald-600"
                        : "text-slate-900"
                  }`}
                >
                  {selectedItem.kind === "expense" ? "-" : selectedItem.kind === "income" ? "+" : ""}
                  ¥{formatYen(Math.abs(selectedItem.amount))}
                </span>
              </div>

              {/* サークル残高 */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">サークル残高</span>
                <span className="text-sm font-medium text-slate-900">
                  ¥{formatYen(balances.find((b) => b.circleId === selectedItem.circleId)?.balance || 0)}
                </span>
              </div>

              {/* サークル名 */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">サークル</span>
                <span className="text-sm text-slate-700">
                  {selectedItem.circleName || "（名前なし）"}
                </span>
              </div>

              {/* 説明（支出・収入の場合） */}
              {selectedItem.description && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">内容</span>
                  <span className="text-sm text-slate-700">{selectedItem.description}</span>
                </div>
              )}

              {/* 収入源（収入の場合） */}
              {selectedItem.source && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">収入源</span>
                  <span className="text-sm text-slate-700">{selectedItem.source}</span>
                </div>
              )}

              {/* タグ */}
              {selectedItem.tags && selectedItem.tags.length > 0 && (
                <div className="flex justify-between items-start">
                  <span className="text-sm text-slate-500">タグ</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {selectedItem.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* メモ（残高の場合） */}
              {selectedItem.note && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">メモ</span>
                  <span className="text-sm text-slate-700">{selectedItem.note}</span>
                </div>
              )}

              {/* 投稿者 */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">投稿者</span>
                <span className="text-sm text-slate-700">{selectedItem.userName}</span>
              </div>

              {/* 日時 */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">日時</span>
                <span className="text-sm text-slate-700">
                  {new Date(selectedItem.createdAt).toLocaleString("ja-JP")}
                </span>
              </div>
            </div>

            {/* ボタン */}
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="flex-1 bg-slate-100 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium"
              >
                戻る
              </button>
              {(selectedItem.kind === "expense" ||
                selectedItem.kind === "income" ||
                selectedItem.kind === "snapshot") &&
                canEditCircle(selectedItem.circleId) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(selectedItem)}
                    disabled={isDeleting}
                    className="flex-1 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                    style={{ backgroundColor: "#dc2626", color: "#ffffff" }}
                  >
                    {isDeleting ? "削除中..." : "削除"}
                  </button>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
