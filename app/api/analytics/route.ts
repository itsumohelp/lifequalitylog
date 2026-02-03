import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

type Period = "daily" | "weekly" | "monthly";

function getDateKey(date: Date, period: Period): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  if (period === "daily") {
    return `${year}-${month}-${day}`;
  } else if (period === "weekly") {
    // 週の開始日（月曜日）を取得
    const dayOfWeek = date.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(date);
    monday.setDate(date.getDate() - diff);
    const mYear = monday.getFullYear();
    const mMonth = String(monday.getMonth() + 1).padStart(2, "0");
    const mDay = String(monday.getDate()).padStart(2, "0");
    return `${mYear}-${mMonth}-${mDay}`;
  } else {
    return `${year}-${month}`;
  }
}

function getPeriodRange(period: Period): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  let start: Date;

  if (period === "daily") {
    // 過去30日
    start = new Date(end);
    start.setDate(start.getDate() - 30);
  } else if (period === "weekly") {
    // 過去12週
    start = new Date(end);
    start.setDate(start.getDate() - 84);
  } else {
    // 過去12ヶ月
    start = new Date(end);
    start.setMonth(start.getMonth() - 12);
  }

  start.setHours(0, 0, 0, 0);
  return { start, end };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const { searchParams } = new URL(request.url);
  const period = (searchParams.get("period") || "daily") as Period;
  const viewType = searchParams.get("viewType") || "total"; // total, circle, tag
  const circleId = searchParams.get("circleId") || null;

  // ユーザーが参加しているサークルを取得
  const memberships = await prisma.circleMember.findMany({
    where: { userId },
    select: { circleId: true, role: true },
  });

  const circleIds = memberships.map((m) => m.circleId);
  const adminCircleIds = memberships
    .filter((m) => m.role === "ADMIN")
    .map((m) => m.circleId);

  if (circleIds.length === 0) {
    return NextResponse.json({ data: [], circles: [], tags: [] });
  }

  // サークル情報を取得
  const circles = await prisma.circle.findMany({
    where: { id: { in: circleIds } },
    select: { id: true, name: true },
  });

  const { start, end } = getPeriodRange(period);

  // スナップショット、支出、収入を取得
  const snapshots = await prisma.circleSnapshot.findMany({
    where: {
      circleId: { in: circleIds },
      createdAt: { lte: end },
    },
    orderBy: { createdAt: "asc" },
  });

  const expenses = await prisma.expense.findMany({
    where: {
      circleId: { in: circleIds },
      createdAt: { gte: start, lte: end },
    },
    orderBy: { createdAt: "asc" },
  });

  const incomes = await prisma.income.findMany({
    where: {
      circleId: { in: circleIds },
      createdAt: { gte: start, lte: end },
    },
    orderBy: { createdAt: "asc" },
  });

  // タグ一覧を取得（選択肢用）
  const allTags = new Set<string>();
  expenses.forEach((e) => {
    if (e.tags) {
      e.tags.forEach((tag) => allTags.add(tag));
    }
  });

  if (viewType === "total") {
    // 全体の残高推移（ADMINサークルのみ）
    // 各期間の最終日の残高を記録
    const periodBalances = new Map<string, Map<string, number>>(); // dateKey -> circleId -> balance

    // 期間内の日付キーを生成
    const periodKeys = new Set<string>();
    const current = new Date(start);
    while (current <= end) {
      periodKeys.add(getDateKey(current, period));
      current.setDate(current.getDate() + 1);
    }

    // 各サークルの残高を計算
    for (const cid of adminCircleIds) {
      const circleSnapshots = snapshots.filter((s) => s.circleId === cid);
      const circleExpenses = expenses.filter((e) => e.circleId === cid);
      const circleIncomes = incomes.filter((i) => i.circleId === cid);

      // 期間開始時点の残高を計算
      const latestSnapshotBeforeStart = circleSnapshots
        .filter((s) => new Date(s.createdAt) < start)
        .pop();

      let runningBalance = latestSnapshotBeforeStart?.amount || 0;

      // 期間開始前の支出・収入を反映
      if (latestSnapshotBeforeStart) {
        const snapshotDate = new Date(latestSnapshotBeforeStart.createdAt);
        const expensesBefore = circleExpenses.filter(
          (e) => new Date(e.createdAt) > snapshotDate && new Date(e.createdAt) < start
        );
        const incomesBefore = circleIncomes.filter(
          (i) => new Date(i.createdAt) > snapshotDate && new Date(i.createdAt) < start
        );
        runningBalance -= expensesBefore.reduce((sum, e) => sum + e.amount, 0);
        runningBalance += incomesBefore.reduce((sum, i) => sum + i.amount, 0);
      }

      // 期間内の各日の残高を計算
      const currentDate = new Date(start);
      let lastDateKey = "";
      while (currentDate <= end) {
        const dateKey = getDateKey(currentDate, period);
        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);

        // その日のスナップショットがあれば残高をリセット
        const daySnapshots = circleSnapshots.filter((s) => {
          const d = new Date(s.createdAt);
          return d >= dayStart && d <= dayEnd;
        });
        if (daySnapshots.length > 0) {
          runningBalance = daySnapshots[daySnapshots.length - 1].amount;
        }

        // その日の支出を引く
        const dayExpenses = circleExpenses.filter((e) => {
          const d = new Date(e.createdAt);
          return d >= dayStart && d <= dayEnd;
        });
        runningBalance -= dayExpenses.reduce((sum, e) => sum + e.amount, 0);

        // その日の収入を足す
        const dayIncomes = circleIncomes.filter((i) => {
          const d = new Date(i.createdAt);
          return d >= dayStart && d <= dayEnd;
        });
        runningBalance += dayIncomes.reduce((sum, i) => sum + i.amount, 0);

        // 期間の最終残高を記録（同じ期間キーなら上書き）
        if (!periodBalances.has(dateKey)) {
          periodBalances.set(dateKey, new Map());
        }
        periodBalances.get(dateKey)!.set(cid, runningBalance);
        lastDateKey = dateKey;

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // 各期間のサークル残高を合計
    const data = Array.from(periodKeys)
      .sort()
      .map((dateKey) => {
        const circleBalances = periodBalances.get(dateKey);
        let totalBalance = 0;
        if (circleBalances) {
          circleBalances.forEach((balance) => {
            totalBalance += balance;
          });
        }
        return { date: dateKey, balance: totalBalance };
      });

    return NextResponse.json({ data, circles, tags: Array.from(allTags) });
  } else if (viewType === "circle") {
    // サークル別の残高推移
    const targetCircleIds = circleId ? [circleId] : circleIds;
    const result: { date: string; [key: string]: string | number }[] = [];
    const dateKeys = new Set<string>();

    // 期間内の日付キーを生成
    const current = new Date(start);
    while (current <= end) {
      dateKeys.add(getDateKey(current, period));
      current.setDate(current.getDate() + 1);
    }

    const circleBalancesByDate = new Map<string, Map<string, number>>();

    for (const cid of targetCircleIds) {
      const circle = circles.find((c) => c.id === cid);
      const circleName = circle?.name || "不明";
      const circleSnapshots = snapshots.filter((s) => s.circleId === cid);
      const circleExpenses = expenses.filter((e) => e.circleId === cid);
      const circleIncomes = incomes.filter((i) => i.circleId === cid);

      const latestSnapshotBeforeStart = circleSnapshots
        .filter((s) => new Date(s.createdAt) < start)
        .pop();

      let runningBalance = latestSnapshotBeforeStart?.amount || 0;

      if (latestSnapshotBeforeStart) {
        const snapshotDate = new Date(latestSnapshotBeforeStart.createdAt);
        const expensesBefore = circleExpenses.filter(
          (e) => new Date(e.createdAt) > snapshotDate && new Date(e.createdAt) < start
        );
        const incomesBefore = circleIncomes.filter(
          (i) => new Date(i.createdAt) > snapshotDate && new Date(i.createdAt) < start
        );
        runningBalance -= expensesBefore.reduce((sum, e) => sum + e.amount, 0);
        runningBalance += incomesBefore.reduce((sum, i) => sum + i.amount, 0);
      }

      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dateKey = getDateKey(currentDate, period);
        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);

        const daySnapshots = circleSnapshots.filter((s) => {
          const d = new Date(s.createdAt);
          return d >= dayStart && d <= dayEnd;
        });
        if (daySnapshots.length > 0) {
          runningBalance = daySnapshots[daySnapshots.length - 1].amount;
        }

        const dayExpenses = circleExpenses.filter((e) => {
          const d = new Date(e.createdAt);
          return d >= dayStart && d <= dayEnd;
        });
        runningBalance -= dayExpenses.reduce((sum, e) => sum + e.amount, 0);

        const dayIncomes = circleIncomes.filter((i) => {
          const d = new Date(i.createdAt);
          return d >= dayStart && d <= dayEnd;
        });
        runningBalance += dayIncomes.reduce((sum, i) => sum + i.amount, 0);

        if (!circleBalancesByDate.has(dateKey)) {
          circleBalancesByDate.set(dateKey, new Map());
        }
        circleBalancesByDate.get(dateKey)!.set(circleName, runningBalance);

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    for (const dateKey of Array.from(dateKeys).sort()) {
      const entry: { date: string; [key: string]: string | number } = { date: dateKey };
      const balances = circleBalancesByDate.get(dateKey);
      if (balances) {
        balances.forEach((balance, circleName) => {
          entry[circleName] = balance;
        });
      }
      result.push(entry);
    }

    return NextResponse.json({ data: result, circles, tags: Array.from(allTags) });
  } else if (viewType === "tag") {
    // タグ別の支出推移（特定サークル）
    if (!circleId) {
      return NextResponse.json({ error: "circleId is required for tag view" }, { status: 400 });
    }

    const circleExpenses = expenses.filter((e) => e.circleId === circleId);
    const tagExpensesByDate = new Map<string, Map<string, number>>();
    const dateKeys = new Set<string>();

    // 期間内の日付キーを生成
    const current = new Date(start);
    while (current <= end) {
      dateKeys.add(getDateKey(current, period));
      current.setDate(current.getDate() + 1);
    }

    // タグ別に支出を集計
    for (const expense of circleExpenses) {
      const dateKey = getDateKey(new Date(expense.createdAt), period);
      if (!tagExpensesByDate.has(dateKey)) {
        tagExpensesByDate.set(dateKey, new Map());
      }
      const tagMap = tagExpensesByDate.get(dateKey)!;

      if (expense.tags && expense.tags.length > 0) {
        for (const tag of expense.tags) {
          const currentAmount = tagMap.get(tag) || 0;
          tagMap.set(tag, currentAmount + expense.amount);
        }
      } else {
        const currentAmount = tagMap.get("その他") || 0;
        tagMap.set("その他", currentAmount + expense.amount);
      }
    }

    const result: { date: string; [key: string]: string | number }[] = [];
    const allTagsInCircle = new Set<string>();
    tagExpensesByDate.forEach((tagMap) => {
      tagMap.forEach((_, tag) => allTagsInCircle.add(tag));
    });

    for (const dateKey of Array.from(dateKeys).sort()) {
      const entry: { date: string; [key: string]: string | number } = { date: dateKey };
      const tagMap = tagExpensesByDate.get(dateKey);

      // すべてのタグに対して値を設定（なければ0）
      allTagsInCircle.forEach((tag) => {
        entry[tag] = tagMap?.get(tag) || 0;
      });

      result.push(entry);
    }

    return NextResponse.json({
      data: result,
      circles,
      tags: Array.from(allTagsInCircle)
    });
  }

  return NextResponse.json({ data: [], circles, tags: [] });
}
