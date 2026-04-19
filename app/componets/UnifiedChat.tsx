"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";
import Link from "next/link";
import { getCategoryEmoji } from "@/lib/expenseParser";
import TwemojiImg from "@/app/components/TwemojiImg";
import { getAvatarColor, getAvatarInitial } from "@/lib/avatar";
import type {
  ExpenseCategory,
  ReactionType,
} from "@/app/generated/prisma/enums";
import MiniBalanceChart, {
  type BalanceDataPoint,
} from "@/app/componets/MiniBalanceChart";

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
  kind:
    | "snapshot"
    | "expense"
    | "income"
    | "summary"
    | "invite"
    | "help"
    | "notice"
    | "notification"
    | "insight";
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
  autoTags?: string[];
  note?: string | null;
  summaryData?: TagSummaryData[]; // 後方互換性のため
  allTimeSummaryData?: TagSummaryData[];
  monthlySummaryData?: TagSummaryData[];
  inviteUrl?: string;
  shortcuts?: ShortcutItem[];
  noticeTitle?: string;
  noticeBody?: string | null;
  noticeLink?: string | null;
  insightText?: string;
  notificationMessage?: string;
  createdAt: string;
};

// 大分類タグ（時間帯別サジェスト）
const CATEGORY_TAGS_BY_HOUR: Record<string, string[]> = {
  morning: ["朝食", "カフェ", "コンビニ", "電車", "バス"],
  lunch: ["ランチ", "外食", "カフェ", "コンビニ", "電車"],
  afternoon: ["カフェ", "おやつ", "買い物", "スーパー", "電車"],
  evening: ["夕食", "外食", "飲み会", "スーパー", "コンビニ"],
  night: ["コンビニ", "外食", "タクシー", "飲み会"],
};

const ALL_CATEGORY_TAGS = [
  "朝食",
  "ランチ",
  "夕食",
  "外食",
  "カフェ",
  "コンビニ",
  "スーパー",
  "飲み会",
  "おやつ",
  "電車",
  "バス",
  "タクシー",
  "ガソリン",
  "日用品",
  "消耗品",
  "娯楽",
  "映画",
  "ゲーム",
  "本",
  "美容院",
  "薬",
  "ジム",
  "医療",
  "衣料",
  "スマホ",
  "通信",
  "給与",
  "ボーナス",
  "副収入",
];

function getTimeSlotKey(hour: number): string {
  if (hour >= 5 && hour < 10) return "morning";
  if (hour >= 10 && hour < 14) return "lunch";
  if (hour >= 14 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 23) return "evening";
  return "night";
}

type Circle = {
  id: string;
  name: string;
  adminName: string;
  isPublic?: boolean;
  allowNewMembers?: boolean;
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

type Props = {
  initialFeed: FeedItem[];
  circles: Circle[];
  circleBalances: CircleBalance[];
  currentUserId: string;
  userRoles: UserRole[];
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

const LAST_CIRCLE_KEY = "lastCircleId";

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
const TIMELINE_VALUE = "__timeline__";

export default function UnifiedChat({
  initialFeed,
  circles,
  circleBalances,
  currentUserId,
  userRoles,
  initialTotalBalance,
  initialMonthlyExpense,
  initialDailyExpense,
  adminCircleIds,
}: Props) {
  const [feed, setFeed] = useState<FeedItem[]>(initialFeed);
  const [filterNoticesOnly, setFilterNoticesOnly] = useState(false);
  const [balances, setBalances] = useState<CircleBalance[]>(circleBalances);
  const [totalBalance, setTotalBalance] = useState<number>(initialTotalBalance);
  const [monthlyExpense, setMonthlyExpense] = useState<number>(
    initialMonthlyExpense,
  );
  const [dailyExpense, setDailyExpense] = useState<number>(initialDailyExpense);
  const [selectedCircleId, setSelectedCircleId] = useState<string>(
    circles[0]?.id || "",
  );
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [filterCircleId, setFilterCircleId] = useState<string>(
    circles[0]?.id || "",
  );
  const [inputMode, setInputMode] = useState<InputMode>("expense");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isCircleModalOpen, setIsCircleModalOpen] = useState(false);
  const [newCircleName, setNewCircleName] = useState("");
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingCircle, setIsCreatingCircle] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [isTagging, setIsTagging] = useState(false);
  const [reactions, setReactions] = useState<Record<string, ReactionData>>({});
  const [reactionsLoading, setReactionsLoading] = useState(false);
  const [togglingReaction, setTogglingReaction] = useState<string | null>(null); // "itemId:type"
  const [hasMoreHistory, setHasMoreHistory] = useState<Record<string, boolean>>(
    {},
  ); // circleId -> hasMore
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showShareNotEnabledDialog, setShowShareNotEnabledDialog] =
    useState(false);
  const [showShareMenuDialog, setShowShareMenuDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [showMiniChart, setShowMiniChart] = useState(false);
  const [circlesState, setCirclesState] = useState<Circle[]>(circles);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  const [insightDialog, setInsightDialog] = useState<{
    text: string;
    circleName: string;
    createdAt: string;
  } | null>(null);
  const [showInsightConsentDialog, setShowInsightConsentDialog] =
    useState(false);
  const pendingInsightCircleIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isTimeline = selectedCircleId === TIMELINE_VALUE;
  const selectedCircle = circlesState.find((c) => c.id === selectedCircleId);

  // AIインサイト問い合わせ
  const runInsight = useCallback(
    async (circleId: string, circleName: string) => {
      if (isInsightLoading) return;
      setIsInsightLoading(true);
      try {
        const res = await fetch("/api/insight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ circleId }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "AIインサイトの取得に失敗しました");
          return;
        }
        const data = await res.json();
        const newItem: FeedItem = {
          id: `insight-${data.id}`,
          kind: "insight",
          circleId,
          circleName,
          userId: "",
          userName: "",
          userImage: null,
          amount: 0,
          insightText: data.insight,
          createdAt: data.generatedAt,
        };
        setFeed((prev) => {
          if (prev.some((item) => item.id === newItem.id)) return prev;
          return [...prev, newItem].sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
        });
      } catch {
        setError("AIインサイトの取得に失敗しました");
      } finally {
        setIsInsightLoading(false);
      }
    },
    [isInsightLoading],
  );

  // シェアボタン処理 → メニューを開く
  const handleShare = () => {
    setShowShareMenuDialog(true);
  };

  // フィードをシェア
  const handleShareFeed = () => {
    if (!selectedCircle?.isPublic) {
      setShowShareMenuDialog(false);
      setShowShareNotEnabledDialog(true);
      return;
    }
    const t = Math.floor(Date.now() / 1000);
    const url = `${window.location.origin}/c/${selectedCircle.id}?t=${t}`;
    if (navigator.share) {
      navigator.share({ url });
    } else {
      window.open(
        `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`,
        "_blank",
        "noopener,noreferrer",
      );
    }
    setShowShareMenuDialog(false);
  };

  // 招待リンクをコピー
  const handleCopyInvite = async () => {
    if (!selectedCircle) return;
    const url = `${window.location.origin}/join?circleId=${selectedCircle.id}`;
    await navigator.clipboard.writeText(url);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  // ユーザーがサークルの編集権限を持っているかチェック
  const canEditCircle = (circleId: string) => {
    const role = userRoles.find((r) => r.circleId === circleId)?.role;
    return role === "ADMIN" || role === "EDITOR";
  };

  // アイテムを操作できるかチェック（ADMINは全員の投稿、EDITORは自分の投稿のみ）
  const canModifyItem = (item: FeedItem) => {
    const role = userRoles.find((r) => r.circleId === item.circleId)?.role;
    if (role === "ADMIN") return true;
    if (role === "EDITOR") return item.userId === currentUserId;
    return false;
  };

  // リアクションを取得（遅延読み込み）
  const fetchReactions = useCallback(async (items: FeedItem[]) => {
    // expense, income, snapshot のみ対象
    const targetItems = items.filter(
      (item) =>
        item.kind === "expense" ||
        item.kind === "income" ||
        item.kind === "snapshot" ||
        item.kind === "notice",
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
  }, []);

  // 過去の実績を取得
  const loadHistory = useCallback(
    async (circleId: string) => {
      if (isLoadingHistory) return;

      // そのサークルの現在の最古のアイテムを取得
      const circleItems = feed.filter((item) => item.circleId === circleId);
      const oldestItem =
        circleItems.length > 0
          ? circleItems.reduce((oldest, item) =>
              new Date(item.createdAt) < new Date(oldest.createdAt)
                ? item
                : oldest,
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
          const newItems = data.feed.filter(
            (item: FeedItem) => !existingIds.has(item.id),
          );

          if (newItems.length > 0) {
            setFeed((prev) =>
              [...newItems, ...prev].sort(
                (a, b) =>
                  new Date(a.createdAt).getTime() -
                  new Date(b.createdAt).getTime(),
              ),
            );
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
    },
    [feed, isLoadingHistory, fetchReactions],
  );

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
    if (!canModifyItem(item)) return;

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
                : cb,
            ),
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
                : cb,
            ),
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

  // 支出・収入にタグを追加
  const handleAddTag = async (item: FeedItem, newTag: string) => {
    const trimmed = newTag.trim();
    if (!trimmed || isTagging) return;

    const currentTags = item.tags || [];
    if (currentTags.includes(trimmed)) return;

    const isIncome = item.kind === "income";
    const id = isIncome
      ? item.id.replace("income-", "")
      : item.id.replace("expense-", "");
    const apiPath = isIncome ? `/api/income/${id}` : `/api/expense/${id}`;
    const updatedTags = [...currentTags, trimmed];

    setIsTagging(true);
    try {
      const res = await fetch(apiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: updatedTags }),
      });

      if (res.ok) {
        setFeed((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, tags: updatedTags } : f)),
        );
        setSelectedItem((prev) =>
          prev && prev.id === item.id ? { ...prev, tags: updatedTags } : prev,
        );
        setTagInput("");
      } else {
        const data = await res.json();
        setError(data.error || "タグの追加に失敗しました");
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setIsTagging(false);
    }
  };

  // 支出・収入のタグを削除
  const handleRemoveTag = async (item: FeedItem, tagToRemove: string) => {
    if (isTagging) return;

    const isIncome = item.kind === "income";
    const id = isIncome
      ? item.id.replace("income-", "")
      : item.id.replace("expense-", "");
    const apiPath = isIncome ? `/api/income/${id}` : `/api/expense/${id}`;
    const updatedTags = (item.tags || []).filter((t) => t !== tagToRemove);

    setIsTagging(true);
    try {
      const res = await fetch(apiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: updatedTags }),
      });

      if (res.ok) {
        setFeed((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, tags: updatedTags } : f)),
        );
        setSelectedItem((prev) =>
          prev && prev.id === item.id ? { ...prev, tags: updatedTags } : prev,
        );
      } else {
        const data = await res.json();
        setError(data.error || "タグの削除に失敗しました");
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setIsTagging(false);
    }
  };

  // 自動タグを削除
  const handleRemoveAutoTag = async (item: FeedItem, tagToRemove: string) => {
    if (isTagging) return;

    const isIncome = item.kind === "income";
    const id = isIncome
      ? item.id.replace("income-", "")
      : item.id.replace("expense-", "");
    const apiPath = isIncome ? `/api/income/${id}` : `/api/expense/${id}`;
    const updatedAutoTags = (item.autoTags || []).filter(
      (t) => t !== tagToRemove,
    );

    setIsTagging(true);
    try {
      const res = await fetch(apiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoTags: updatedAutoTags }),
      });

      if (res.ok) {
        setFeed((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, autoTags: updatedAutoTags } : f,
          ),
        );
        setSelectedItem((prev) =>
          prev && prev.id === item.id
            ? { ...prev, autoTags: updatedAutoTags }
            : prev,
        );
      } else {
        const data = await res.json();
        setError(data.error || "タグの削除に失敗しました");
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setIsTagging(false);
    }
  };

  // 初期読み込み時に最後に開いたサークルを復元
  useEffect(() => {
    if (isLocalStorageAvailable()) {
      const savedCircleId = localStorage.getItem(LAST_CIRCLE_KEY);
      if (savedCircleId === TIMELINE_VALUE) {
        setSelectedCircleId(TIMELINE_VALUE);
        setFilterCircleId("");
      } else if (savedCircleId && circles.find((c) => c.id === savedCircleId)) {
        setSelectedCircleId(savedCircleId);
        setFilterCircleId(savedCircleId);
      }
    }

    // お知らせを取得してfeedに追加
    fetch("/api/notices")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.notices?.length) return;
        const items: FeedItem[] = (
          data.notices as {
            id: string;
            title: string;
            body: string | null;
            link: string | null;
            createdAt: string;
          }[]
        ).map((n) => ({
          id: `notice-${n.id}`,
          kind: "notice" as const,
          circleId: "",
          circleName: "",
          userId: "system",
          userName: "CircleRun",
          userImage: null,
          amount: 0,
          noticeTitle: n.title,
          noticeBody: n.body,
          noticeLink: n.link,
          createdAt: n.createdAt,
        }));
        setFeed((prev) => [
          ...prev.filter((i) => i.kind !== "notice"),
          ...items,
        ]);
      })
      .catch((e) => console.error("Failed to fetch notices:", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [feed]);

  // サークル切り替え時に一番下にスクロール + 一時的なアイテムを削除
  useEffect(() => {
    // 集計・ヘルプ・招待などの一時的なアイテムを削除（お知らせは残す）
    setFeed((prev) =>
      prev.filter(
        (item) =>
          item.kind !== "summary" &&
          item.kind !== "help" &&
          item.kind !== "invite",
      ),
    );
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
    return (
      normalized === "招待" ||
      normalized === "しょうたい" ||
      normalized === "invite"
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
        const res = await fetch(
          `/api/summary?circleId=${encodeURIComponent(selectedCircleId)}`,
        );
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
          body: JSON.stringify({
            circleId: selectedCircleId,
            text: input.trim(),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "エラーが発生しました");
          return;
        }

        // 支出後のサークル残高を計算
        const currentCircleBalance =
          balances.find((cb) => cb.circleId === selectedCircleId)?.balance || 0;
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
          autoTags: data.expense.autoTags || [],
          createdAt: new Date().toISOString(),
        };

        // 登録後にミニチャートを表示
        setShowMiniChart(true);

        // 一時的なアイテム（集計・ヘルプ・招待）を削除して新しいアイテムを追加
        setFeed((prev) => [
          ...prev.filter(
            (item) =>
              item.kind !== "summary" &&
              item.kind !== "help" &&
              item.kind !== "invite",
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
              : cb,
          ),
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
          body: JSON.stringify({
            circleId: selectedCircleId,
            text: input.trim(),
          }),
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
          ...prev.filter(
            (item) =>
              item.kind !== "summary" &&
              item.kind !== "help" &&
              item.kind !== "invite",
          ),
          newItem,
        ]);

        // サークル残高を更新（収入なので足す）
        setBalances((prev) =>
          prev.map((cb) =>
            cb.circleId === selectedCircleId
              ? { ...cb, balance: cb.balance + data.income.amount }
              : cb,
          ),
        );

        // ADMINサークルの場合、合計残高も更新
        if (adminCircleIds.includes(selectedCircleId)) {
          setTotalBalance((prev) => prev + data.income.amount);
        }

        // 登録後にミニチャートを表示
        setShowMiniChart(true);
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
          ...prev.filter(
            (item) =>
              item.kind !== "summary" &&
              item.kind !== "help" &&
              item.kind !== "invite",
          ),
          newSnapshotItem,
        ]);

        // 旧残高を取得
        const oldBalance =
          balances.find((cb) => cb.circleId === selectedCircleId)?.balance || 0;
        const balanceDiff = amount - oldBalance;

        // サークル残高を新しい残高に更新
        setBalances((prev) =>
          prev.map((cb) =>
            cb.circleId === selectedCircleId ? { ...cb, balance: amount } : cb,
          ),
        );

        // ADMINサークルの場合、合計残高も更新
        if (adminCircleIds.includes(selectedCircleId)) {
          setTotalBalance((prev) => prev + balanceDiff);
        }

        // 登録後にミニチャートを表示
        setShowMiniChart(true);
      }

      setInput("");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // フィルタリング（タイムライン時はお知らせ＋全サークル、それ以外は選択サークルのみ）
  const filteredFeed = isTimeline
    ? filterNoticesOnly
      ? feed
          .filter(
            (item) => item.kind === "notice" || item.kind === "notification",
          )
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          )
      : [...feed].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )
    : feed.filter(
        (item) => item.kind !== "notice" && item.circleId === filterCircleId,
      );

  // 選択中サークルの直近30日間の残高推移データ（チャート用）
  const miniChartData = useMemo((): BalanceDataPoint[] => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const points = feed
      .filter((item) => {
        if (item.circleId !== selectedCircleId) return false;
        if (new Date(item.createdAt) < thirtyDaysAgo) return false;
        if (item.kind === "snapshot") return true;
        if (
          (item.kind === "expense" || item.kind === "income") &&
          item.circleBalanceAfter !== undefined
        )
          return true;
        return false;
      })
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
      .map((item) => ({
        date: item.createdAt,
        balance:
          item.kind === "snapshot" ? item.amount : item.circleBalanceAfter!,
      }));

    return points;
  }, [feed, selectedCircleId]);

  // 選択中アイテムのサークルに存在する既存タグ一覧（詳細モーダルのサジェスト用）
  const existingCircleTags = useMemo((): string[] => {
    if (!selectedItem) return [];
    const tags = new Set<string>();
    feed
      .filter((item) => item.circleId === selectedItem.circleId && item.tags)
      .forEach((item) => item.tags!.forEach((t) => tags.add(t)));
    return Array.from(tags);
  }, [feed, selectedItem]);

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
    {} as Record<string, FeedItem[]>,
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
        {isBreakdownOpen &&
          balances.length > 0 &&
          (() => {
            const adminBalances = balances.filter((cb) =>
              adminCircleIds.includes(cb.circleId),
            );
            const invitedBalances = balances.filter(
              (cb) => !adminCircleIds.includes(cb.circleId),
            );

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
                    <span className="whitespace-nowrap w-16 text-right">
                      全期間
                    </span>
                    <span className="whitespace-nowrap w-16 text-right">
                      今月
                    </span>
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

      {/* 直近30日間の残高推移チャート（登録後に表示） */}
      {showMiniChart && miniChartData.length >= 2 && (
        <MiniBalanceChart
          data={miniChartData}
          onClose={() => setShowMiniChart(false)}
        />
      )}

      {/* フィード表示 */}
      <div className="flex-1 relative min-h-0 overflow-hidden">
        {/* タイムライン時：お知らせフィルタ ベルアイコン（左下） */}
        {isTimeline && (
          <button
            type="button"
            onClick={() => setFilterNoticesOnly((v) => !v)}
            title={filterNoticesOnly ? "全て表示" : "お知らせ・通知のみ表示"}
            className={`absolute bottom-3 left-3 z-10 w-10 h-10 rounded-full flex items-center justify-center transition ${
              filterNoticesOnly
                ? "bg-sky-500/80 text-white"
                : "bg-black/20 text-slate-600"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
        )}
        <div
          ref={scrollRef}
          className="absolute inset-0 overflow-y-auto px-3 py-1 space-y-1 bg-slate-50"
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
              <p className="mb-2">最近の記録がありません</p>
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
                    const isOwnMessage =
                      item.kind !== "insight" && item.userId === currentUserId;
                    const prevItem = idx > 0 ? items[idx - 1] : null;
                    const isSameUserAsPrev =
                      prevItem && prevItem.userId === item.userId;

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
                                style={{
                                  backgroundColor:
                                    item.kind === "insight"
                                      ? "#0ea5e9"
                                      : getAvatarColor(item.userId),
                                }}
                              >
                                {item.kind === "insight"
                                  ? "AI"
                                  : getAvatarInitial(item.userName)}
                              </div>
                            )}
                          </div>
                        )}

                        {/* メッセージ部分 */}
                        <div
                          className={`max-w-full ${isOwnMessage ? "items-end" : ""}`}
                        >
                          {/* 投稿者名（バブルの上、連続投稿時は非表示） */}
                          {!isSameUserAsPrev && (
                            <div
                              className={`text-[10px] text-slate-500 mb-0.5 ${
                                isOwnMessage ? "text-right" : ""
                              }`}
                            >
                              {item.kind === "insight" ? "AI" : item.userName}
                            </div>
                          )}

                          {/* メッセージバブル */}
                          <button
                            type="button"
                            onClick={() => {
                              if (item.kind === "insight") {
                                setInsightDialog({
                                  text: item.insightText ?? "",
                                  circleName: item.circleName ?? "",
                                  createdAt: item.createdAt,
                                });
                              } else {
                                setSelectedItem(item);
                              }
                            }}
                            className={`rounded-2xl px-3 py-1.5 text-left w-full ${
                              isOwnMessage
                                ? "bg-slate-900 text-white rounded-tr-sm"
                                : "bg-white border border-slate-200 rounded-tl-sm"
                            } active:opacity-80 transition-opacity`}
                          >
                            {/* サークル名 + 時刻（バブル内上部） */}
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`text-xs ${item.kind === "notice" ? "font-bold" : "font-medium"} ${
                                  isOwnMessage
                                    ? "text-slate-300"
                                    : "text-slate-700"
                                }`}
                              >
                                {item.kind === "notice" ? (
                                  `📣 ${item.noticeTitle}`
                                ) : item.kind === "notification" ? (
                                  `🔔 ${item.circleName}`
                                ) : item.kind === "insight" ? (
                                  <>
                                    {item.circleName && (
                                      <span className="text-sky-500">
                                        {item.circleName}
                                      </span>
                                    )}
                                    {item.circleName ? "  " : ""}AI インサイト
                                  </>
                                ) : (
                                  item.circleName || "（名前なし）"
                                )}
                              </span>
                              <span
                                className={`text-[10px] ${
                                  isOwnMessage
                                    ? "text-slate-500"
                                    : "text-slate-400"
                                }`}
                              >
                                {formatTime(item.createdAt)}
                              </span>
                            </div>

                            {item.kind === "expense" ? (
                              <>
                                {/* カテゴリ絵文字 + 金額 + 累計 + タグバッジ */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <TwemojiImg
                                    emoji={getCategoryEmoji(
                                      (item.category ||
                                        "OTHER") as ExpenseCategory,
                                    )}
                                    size={16}
                                  />
                                  <span
                                    className={`font-semibold text-sm ${
                                      isOwnMessage
                                        ? "text-red-300"
                                        : "text-red-600"
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
                                  {item.autoTags &&
                                    item.autoTags.length > 0 && (
                                      <>
                                        {item.autoTags.map((tag, idx) => (
                                          <span
                                            key={`auto-${idx}`}
                                            className="inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-white"
                                            title="自動タグ"
                                          >
                                            ✦ {tag}
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
                                  {item.autoTags &&
                                    item.autoTags.length > 0 && (
                                      <>
                                        {item.autoTags.map((tag, idx) => (
                                          <span
                                            key={`auto-${idx}`}
                                            className="inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-white"
                                            title="自動タグ"
                                          >
                                            ✦ {tag}
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
                                    isOwnMessage
                                      ? "text-slate-400"
                                      : "text-slate-500"
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
                                {item.allTimeSummaryData &&
                                item.allTimeSummaryData.length > 0 ? (
                                  <div className="space-y-1.5 mb-4">
                                    {item.allTimeSummaryData.map((s, idx) => (
                                      <div
                                        key={idx}
                                        className={`flex items-center justify-between text-xs ${
                                          isOwnMessage
                                            ? "text-slate-200"
                                            : "text-slate-700"
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
                                            isOwnMessage
                                              ? "text-red-300"
                                              : "text-red-600"
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
                                      isOwnMessage
                                        ? "text-slate-400"
                                        : "text-slate-500"
                                    }`}
                                  >
                                    タグ付き支出がありません
                                  </div>
                                )}

                                {/* 今月分集計 */}
                                <div className="text-xs font-medium mb-2">
                                  📅 今月のタグ別集計
                                </div>
                                {item.monthlySummaryData &&
                                item.monthlySummaryData.length > 0 ? (
                                  <div className="space-y-1.5">
                                    {item.monthlySummaryData.map((s, idx) => (
                                      <div
                                        key={idx}
                                        className={`flex items-center justify-between text-xs ${
                                          isOwnMessage
                                            ? "text-slate-200"
                                            : "text-slate-700"
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
                                            isOwnMessage
                                              ? "text-red-300"
                                              : "text-red-600"
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
                                      isOwnMessage
                                        ? "text-slate-400"
                                        : "text-slate-500"
                                    }`}
                                  >
                                    今月のタグ付き支出がありません
                                  </div>
                                )}
                              </>
                            ) : item.kind === "notice" ? (
                              <>
                                {/* 運営からのお知らせ（タイトルはヘッダー行に表示済み） */}
                                {item.noticeBody && (
                                  <p className="text-[11px] text-slate-500 whitespace-pre-wrap leading-relaxed">
                                    {item.noticeBody}
                                  </p>
                                )}
                                {item.noticeLink && (
                                  <a
                                    href={item.noticeLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-sky-500 underline"
                                  >
                                    🔗 詳細を見る
                                  </a>
                                )}
                              </>
                            ) : item.kind === "notification" ? (
                              <>
                                {/* サークル内通知 */}
                                <p className="text-[11px] text-slate-600">
                                  {item.notificationMessage}
                                </p>
                              </>
                            ) : item.kind === "help" ? (
                              <>
                                {/* ショートカット一覧 */}
                                <div className="text-xs font-medium mb-2">
                                  📋 ショートカット一覧
                                </div>
                                {item.shortcuts &&
                                  item.shortcuts.length > 0 && (
                                    <div className="space-y-2">
                                      {item.shortcuts.map((shortcut, idx) => (
                                        <div
                                          key={idx}
                                          className={`text-xs ${
                                            isOwnMessage
                                              ? "text-slate-200"
                                              : "text-slate-700"
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
                                            {shortcut.aliases
                                              .slice(0, 2)
                                              .map((alias, aliasIdx) => (
                                                <span
                                                  key={aliasIdx}
                                                  className={`text-[10px] ${
                                                    isOwnMessage
                                                      ? "text-slate-400"
                                                      : "text-slate-500"
                                                  }`}
                                                >
                                                  {alias}
                                                </span>
                                              ))}
                                          </div>
                                          <div
                                            className={`text-[10px] ${
                                              isOwnMessage
                                                ? "text-slate-400"
                                                : "text-slate-500"
                                            }`}
                                          >
                                            {shortcut.description}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                              </>
                            ) : item.kind === "insight" ? (
                              <>
                                {/* AIインサイト */}
                                <p className="text-sm text-slate-800 font-medium leading-snug">
                                  {(item.insightText ?? "").length > 50 ? (
                                    <>
                                      {(item.insightText ?? "").slice(0, 50)}
                                      <span className="text-sky-500 text-xs ml-1">
                                        続きを読む
                                      </span>
                                    </>
                                  ) : (
                                    item.insightText
                                  )}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-1">
                                  AI による直近2週間の傾向分析
                                </p>
                              </>
                            ) : (
                              <>
                                {/* 残高スナップショット */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`font-semibold text-sm ${
                                      isOwnMessage
                                        ? "text-white"
                                        : "text-slate-900"
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
                          </button>

                          {/* リアクションボタン（expense, income, snapshot, notice） */}
                          {(item.kind === "expense" ||
                            item.kind === "income" ||
                            item.kind === "snapshot" ||
                            item.kind === "notice") && (
                            <div
                              className={`flex items-center gap-1 mt-1 ${
                                isOwnMessage ? "justify-end" : "justify-start"
                              }`}
                            >
                              {(
                                [
                                  "CHECK",
                                  "GOOD",
                                  "BAD",
                                  "DOGEZA",
                                ] as ReactionType[]
                              ).map((type) => {
                                const itemKey = `${item.kind}:${item.id.replace(`${item.kind}-`, "")}`;
                                const reactionData = reactions[itemKey];
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleReaction(item, type);
                                    }}
                                    disabled={
                                      reactionsLoading || !!togglingReaction
                                    }
                                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition ${
                                      hasReacted
                                        ? "bg-slate-700 text-white"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    } ${reactionsLoading || isToggling ? "opacity-50" : ""}`}
                                  >
                                    <TwemojiImg emoji={emoji} size={14} />
                                    {count > 0 && (
                                      <span className="text-[10px] min-w-[12px] text-center">
                                        {count}
                                      </span>
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
      </div>

      {/* AIインサイトボタン（管理者サークルのみ、条件付き表示） */}
      {!isTimeline &&
        adminCircleIds.includes(selectedCircleId) &&
        (() => {
          const todayJST = new Date(Date.now() + 9 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10);

          // 今日のインサイトがあれば非表示
          const lastInsight = feed
            .filter(
              (item) =>
                item.kind === "insight" && item.circleId === selectedCircleId,
            )
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            )[0];
          const hasTodayInsight =
            lastInsight &&
            new Date(
              new Date(lastInsight.createdAt).getTime() + 9 * 60 * 60 * 1000,
            )
              .toISOString()
              .slice(0, 10) === todayJST;
          if (hasTodayInsight) return null;

          // AIの最終投稿以降に自分の投稿がなければ非表示
          const lastUserPost = feed
            .filter(
              (item) =>
                item.circleId === selectedCircleId &&
                item.userId === currentUserId &&
                item.kind !== "insight",
            )
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            )[0];
          const hasNewActivity =
            lastUserPost &&
            (!lastInsight ||
              new Date(lastUserPost.createdAt) >
                new Date(lastInsight.createdAt));
          if (!hasNewActivity) return null;

          const AI_CONSENT_KEY = "aiInsightConsented";
          const hasConsented =
            isLocalStorageAvailable() &&
            localStorage.getItem(AI_CONSENT_KEY) === "true";

          return (
            <div className="flex-shrink-0 px-3 pb-1 bg-slate-50 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  if (hasConsented) {
                    runInsight(selectedCircleId, selectedCircle?.name ?? "");
                  } else {
                    pendingInsightCircleIdRef.current = selectedCircleId;
                    setShowInsightConsentDialog(true);
                  }
                }}
                disabled={isInsightLoading}
                className="text-[11px] text-sky-600 border border-sky-200 bg-sky-50 rounded-full px-3 py-0.5 hover:bg-sky-100 disabled:opacity-50 transition"
              >
                {isInsightLoading
                  ? "分析中..."
                  : "✨ 昨日までの傾向をAIに聞いてみる"}
              </button>
            </div>
          );
        })()}

      {/* 入力エリア（画面下部に固定） */}
      <div className="flex-shrink-0 bg-white border-t border-slate-200">
        {/* エラー表示 */}
        {!isTimeline && error && (
          <div className="mx-3 mt-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* サークル選択 + アクションボタン */}
        <div className="px-3 py-1.5 flex items-center gap-2">
          <select
            value={selectedCircleId}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedCircleId(value);
              setError(null);
              if (value === TIMELINE_VALUE) {
                setFilterCircleId("");
              } else {
                setFilterCircleId(value);
              }
              if (isLocalStorageAvailable()) {
                localStorage.setItem(LAST_CIRCLE_KEY, value);
              }
            }}
            className="flex-1 min-w-0 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-slate-400"
          >
            {circlesState.map((circle) => (
              <option key={circle.id} value={circle.id}>
                {circle.name || "（名前なし）"}　{circle.adminName}
              </option>
            ))}
            <option value={TIMELINE_VALUE}>── タイムライン ──</option>
          </select>

          {/* 集計ボタン */}
          <Link
            href="/dashboard/analytics"
            className="flex-shrink-0 p-2.5 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300 active:scale-95 transition"
            title="集計"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3v18h18" />
              <path d="M18 17V9" />
              <path d="M13 17V5" />
              <path d="M8 17v-3" />
            </svg>
          </Link>

          {/* シェアボタン */}
          <button
            type="button"
            onClick={handleShare}
            className="flex-shrink-0 p-2.5 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300 active:scale-95 transition"
            title="シェア"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>

          {/* 設定ボタン */}
          <Link
            href="/dashboard/settings"
            className="flex-shrink-0 p-2.5 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300 active:scale-95 transition"
            title="設定"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </Link>
        </div>

        {/* 入力フォーム：モード切替 + 入力 + 送信（タイムライン時は非表示） */}
        {!isTimeline && (
          <form onSubmit={handleSubmit} className="px-3 pb-3 pt-1">
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
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                placeholder={
                  inputMode === "expense"
                    ? "金額を入力"
                    : inputMode === "income"
                      ? "金額を入力"
                      : "残高を入力"
                }
                disabled={isLoading || !selectedCircleId}
                className="flex-1 min-w-0 bg-slate-100 border border-slate-200 rounded-full px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim() || !selectedCircleId}
                className="flex-shrink-0 w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center disabled:opacity-40 transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
              </button>
            </div>
          </form>
        )}

        {/* iPhoneセーフエリア用スペース */}
        <div
          className="h-2"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        />
      </div>

      {/* シェアメニューダイアログ */}
      {showShareMenuDialog && selectedCircle && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowShareMenuDialog(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-slate-900 mb-4">
              {selectedCircle.name}
            </h3>
            <div className="space-y-2">
              {/* フィードをシェア（公開時のみ） */}
              {selectedCircle.isPublic && (
                <button
                  type="button"
                  onClick={handleShareFeed}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-left transition"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-slate-600 flex-shrink-0"
                  >
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      フィードをシェア
                    </p>
                    <p className="text-xs text-slate-500">公開フィードを共有</p>
                  </div>
                </button>
              )}
              {/* 招待リンクをコピー */}
              <button
                type="button"
                onClick={handleCopyInvite}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-left transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-slate-600 flex-shrink-0"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {copiedInvite ? "コピーしました！" : "招待リンクをコピー"}
                  </p>
                  <p className="text-xs text-slate-500">リンクをLINE等で送る</p>
                </div>
              </button>
              {/* 招待QRコード（allowNewMembersがONかつADMINのみ） */}
              {selectedCircle.allowNewMembers &&
                adminCircleIds.includes(selectedCircle.id) && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowShareMenuDialog(false);
                      setShowQRDialog(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-left transition"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-slate-600 flex-shrink-0"
                    >
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                      <rect
                        x="5"
                        y="5"
                        width="3"
                        height="3"
                        fill="currentColor"
                        stroke="none"
                      />
                      <rect
                        x="16"
                        y="5"
                        width="3"
                        height="3"
                        fill="currentColor"
                        stroke="none"
                      />
                      <rect
                        x="5"
                        y="16"
                        width="3"
                        height="3"
                        fill="currentColor"
                        stroke="none"
                      />
                      <path
                        d="M14 14h3v3h-3z"
                        fill="currentColor"
                        stroke="none"
                      />
                      <path d="M17 17h4v4h-4z" />
                      <path d="M14 20h3" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        招待QRコードを表示
                      </p>
                      <p className="text-xs text-slate-500">
                        その場で見せて参加してもらう
                      </p>
                    </div>
                  </button>
                )}
            </div>
            <button
              type="button"
              onClick={() => setShowShareMenuDialog(false)}
              className="w-full mt-3 bg-slate-100 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* QRコードダイアログ */}
      {showQRDialog && selectedCircle && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowQRDialog(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-sm p-5 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              {selectedCircle.name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              QRコードを読み取って参加
            </p>
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <QRCodeSVG
                value={`${typeof window !== "undefined" ? window.location.origin : "https://crun.click"}/join?circleId=${selectedCircle.id}`}
                size={200}
                bgColor="#ffffff"
                fgColor="#0f172a"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowQRDialog(false)}
              className="w-full mt-4 bg-slate-100 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* AIインサイト同意ダイアログ */}
      {showInsightConsentDialog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowInsightConsentDialog(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-slate-900 mb-3">
              AIに傾向を分析してもらいますか？
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              以下の情報をAI（Google
              Gemini）に送信して、直近の傾向を分析します。
            </p>
            <ul className="text-sm text-slate-700 space-y-1.5 mb-3 pl-1">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>
                  支出・収入の<strong>金額・説明文</strong>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>残高スナップショット</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">✗</span>
                <span className="text-slate-500">
                  メールアドレス・個人情報は含みません
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">✗</span>
                <span className="text-slate-500">タグは含みません</span>
              </li>
            </ul>
            <p className="text-xs text-slate-400 mb-4">
              詳しくは
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-500 underline ml-0.5"
              >
                プライバシーポリシー
              </a>
              の「AIの利用について」をご確認ください。
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowInsightConsentDialog(false)}
                className="flex-1 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isLocalStorageAvailable()) {
                    localStorage.setItem("aiInsightConsented", "true");
                  }
                  setShowInsightConsentDialog(false);
                  const circleId = pendingInsightCircleIdRef.current;
                  const circleName =
                    circlesState.find((c) => c.id === circleId)?.name ?? "";
                  if (circleId) runInsight(circleId, circleName);
                }}
                className="flex-1 py-2 text-sm text-white bg-sky-500 rounded-lg hover:bg-sky-600 transition font-medium"
              >
                同意して分析する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AIインサイト全文ダイアログ */}
      {insightDialog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setInsightDialog(null)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center text-xs text-white font-medium">
                AI
              </div>
              <div>
                {insightDialog.circleName && (
                  <p className="text-[10px] text-sky-500 font-medium leading-none">
                    {insightDialog.circleName}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  {new Date(insightDialog.createdAt).toLocaleDateString(
                    "ja-JP",
                    { month: "short", day: "numeric" },
                  )}{" "}
                  AI インサイト
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-800 leading-relaxed">
              {insightDialog.text}
            </p>
            <p className="text-[10px] text-slate-400 mt-3">
              AI による直近2週間の傾向分析
            </p>
            <button
              type="button"
              onClick={() => setInsightDialog(null)}
              className="mt-4 w-full py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* サークル追加モーダル */}
      {/* シェア未許可ダイアログ */}
      {showShareNotEnabledDialog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowShareNotEnabledDialog(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-slate-900 mb-3">
              フィードの公開設定
            </h3>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-slate-700">フィードを公開する</span>
              <button
                type="button"
                disabled={togglingPublic}
                onClick={async () => {
                  if (!selectedCircle) return;
                  const newVal = !selectedCircle.isPublic;
                  setTogglingPublic(true);
                  try {
                    const res = await fetch(
                      `/api/circles/${selectedCircle.id}`,
                      {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ isPublic: newVal }),
                      },
                    );
                    if (res.ok) {
                      setCirclesState((prev) =>
                        prev.map((c) =>
                          c.id === selectedCircle.id
                            ? { ...c, isPublic: newVal }
                            : c,
                        ),
                      );
                      if (newVal) {
                        setShowShareNotEnabledDialog(false);
                        const t = Math.floor(Date.now() / 1000);
                        const url = `${window.location.origin}/c/${selectedCircle.id}?t=${t}`;
                        if (navigator.share) {
                          navigator.share({ url });
                        } else {
                          window.open(
                            `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`,
                            "_blank",
                            "noopener,noreferrer",
                          );
                        }
                      }
                    }
                  } finally {
                    setTogglingPublic(false);
                  }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${selectedCircle?.isPublic ? "bg-emerald-500" : "bg-slate-300"} ${togglingPublic ? "opacity-50" : ""}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${selectedCircle?.isPublic ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">
              非公開への変更は設定画面のサークル詳細から可能です
            </p>
            <button
              type="button"
              onClick={() => setShowShareNotEnabledDialog(false)}
              className="w-full bg-slate-100 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {isCircleModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setIsCircleModalOpen(false);
            setNewCircleName("");
          }}
        >
          <div
            className="bg-white rounded-xl w-full max-w-sm p-4"
            onClick={(e) => e.stopPropagation()}
          >
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
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-sm p-4"
            onClick={(e) => e.stopPropagation()}
          >
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
                  {selectedItem.kind === "expense"
                    ? "-"
                    : selectedItem.kind === "income"
                      ? "+"
                      : ""}
                  ¥{formatYen(Math.abs(selectedItem.amount))}
                </span>
              </div>

              {/* サークル残高 */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">サークル残高</span>
                <span className="text-sm font-medium text-slate-900">
                  ¥
                  {formatYen(
                    balances.find((b) => b.circleId === selectedItem.circleId)
                      ?.balance || 0,
                  )}
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
                  <span className="text-sm text-slate-700">
                    {selectedItem.description}
                  </span>
                </div>
              )}

              {/* 収入源（収入の場合） */}
              {selectedItem.source && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">収入源</span>
                  <span className="text-sm text-slate-700">
                    {selectedItem.source}
                  </span>
                </div>
              )}

              {/* タグ（支出・収入の場合はタグ編集UI） */}
              {(selectedItem.kind === "expense" ||
                selectedItem.kind === "income") &&
              canModifyItem(selectedItem) ? (
                <div className="space-y-2">
                  <span className="text-sm text-slate-500">タグ</span>

                  {/* 現在のタグ */}
                  <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                    {(selectedItem.tags || []).length === 0 &&
                    (selectedItem.autoTags || []).length === 0 ? (
                      <span className="text-xs text-slate-400">タグなし</span>
                    ) : (
                      <>
                        {(selectedItem.tags || []).map((tag, idx) => (
                          <span
                            key={idx}
                            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(selectedItem, tag)}
                              disabled={isTagging}
                              className="text-sky-400 hover:text-sky-600 leading-none disabled:opacity-50"
                              aria-label={`${tag}を削除`}
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                        {(selectedItem.autoTags || []).map((tag, idx) => (
                          <span
                            key={`auto-${idx}`}
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500 text-white"
                            title="自動タグ"
                          >
                            ✦ {tag}
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveAutoTag(selectedItem, tag)
                              }
                              disabled={isTagging}
                              className="text-yellow-100 hover:text-white leading-none disabled:opacity-50"
                              aria-label={`自動タグ ${tag}を削除`}
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </>
                    )}
                  </div>

                  {/* 時間帯カテゴリから選択 */}
                  {(() => {
                    const hour = new Date(selectedItem.createdAt).getHours();
                    const slotKey = getTimeSlotKey(hour);
                    const slotTags = CATEGORY_TAGS_BY_HOUR[slotKey] || [];
                    const appliedTags = [
                      ...(selectedItem.tags || []),
                      ...(selectedItem.autoTags || []),
                    ];
                    const suggestions = slotTags.filter(
                      (t) => !appliedTags.includes(t),
                    );
                    if (suggestions.length === 0) return null;
                    return (
                      <div>
                        <div className="text-[11px] text-slate-400 mb-1">
                          カテゴリから選択
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {suggestions.map((tag, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleAddTag(selectedItem, tag)}
                              disabled={isTagging}
                              className="text-xs px-2 py-0.5 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-50 active:scale-95 transition disabled:opacity-50"
                            >
                              + {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* 既存タグから選択 */}
                  {existingCircleTags.filter(
                    (t) => !(selectedItem.tags || []).includes(t),
                  ).length > 0 && (
                    <div>
                      <div className="text-[11px] text-slate-400 mb-1">
                        既存のタグから選択
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {existingCircleTags
                          .filter((t) => !(selectedItem.tags || []).includes(t))
                          .map((tag, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleAddTag(selectedItem, tag)}
                              disabled={isTagging}
                              className="text-xs px-2 py-0.5 rounded-full border border-sky-300 text-sky-600 hover:bg-sky-50 active:scale-95 transition disabled:opacity-50"
                            >
                              + {tag}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* 新規タグ入力 */}
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag(selectedItem, tagInput);
                        }
                      }}
                      placeholder="新しいタグ名"
                      disabled={isTagging}
                      className="flex-1 text-sm border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:border-sky-400 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTag(selectedItem, tagInput)}
                      disabled={isTagging || !tagInput.trim()}
                      className="text-xs bg-sky-500 text-white rounded-lg px-3 py-1 font-medium disabled:opacity-50 active:scale-95 transition"
                    >
                      追加
                    </button>
                  </div>
                </div>
              ) : (selectedItem.tags && selectedItem.tags.length > 0) ||
                (selectedItem.autoTags && selectedItem.autoTags.length > 0) ? (
                <div className="flex justify-between items-start">
                  <span className="text-sm text-slate-500">タグ</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {(selectedItem.tags || []).map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700"
                      >
                        {tag}
                      </span>
                    ))}
                    {(selectedItem.autoTags || []).map((tag, idx) => (
                      <span
                        key={`auto-${idx}`}
                        className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full bg-amber-500 text-white"
                        title="自動タグ"
                      >
                        ✦ {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* メモ（残高の場合） */}
              {selectedItem.note && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">メモ</span>
                  <span className="text-sm text-slate-700">
                    {selectedItem.note}
                  </span>
                </div>
              )}

              {/* 投稿者 */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">投稿者</span>
                <span className="text-sm text-slate-700">
                  {selectedItem.userName}
                </span>
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
                onClick={() => {
                  setSelectedItem(null);
                  setTagInput("");
                }}
                className="flex-1 bg-slate-100 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium"
              >
                戻る
              </button>
              {(selectedItem.kind === "expense" ||
                selectedItem.kind === "income" ||
                selectedItem.kind === "snapshot") &&
                canModifyItem(selectedItem) && (
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
