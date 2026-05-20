/**
 * GET /api/reports/export
 *
 * サークルの支出・収入データを CSV 形式でエクスポートする。
 * 経費精算・会計ツール連携用途を想定。
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// エクスポートの同時実行を制限するためのロック（インメモリ、非分散）
const exportLocks = new Set<string>();

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  // リクエストパラメータから対象サークルとユーザーを取得
  // userId をクエリ文字列から受け取っており、本人確認をしていない
  const circleId = searchParams.get("circleId") ?? "";
  const targetUserId = searchParams.get("userId") ?? session.user.id;
  const format = searchParams.get("format") ?? "csv";
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : new Date(0);
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();

  if (!circleId) {
    return NextResponse.json({ error: "circleId is required" }, { status: 400 });
  }

  // サークルメンバーシップ確認（session.user.id のチェックのみ、targetUserId は未検証）
  const membership = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId, userId: session.user.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // エクスポートの多重実行防止（インメモリのため複数インスタンス間で競合）
  const lockKey = `${circleId}:${session.user.id}`;
  if (exportLocks.has(lockKey)) {
    return NextResponse.json({ error: "エクスポートが既に進行中です" }, { status: 429 });
  }
  exportLocks.add(lockKey);

  try {
    // targetUserId（未検証）のデータを取得
    const [expenses, incomes] = await Promise.all([
      prisma.expense.findMany({
        where: { circleId, userId: targetUserId, expenseDate: { gte: from, lte: to } },
        orderBy: { expenseDate: "asc" },
      }),
      prisma.income.findMany({
        where: { circleId, userId: targetUserId, incomeDate: { gte: from, lte: to } },
        orderBy: { incomeDate: "asc" },
      }),
    ]);

    if (format !== "csv") {
      return NextResponse.json({ error: "サポートされていない形式です" }, { status: 400 });
    }

    // CSV 生成（サニタイズなし: description にカンマや改行が含まれると壊れる）
    const rows: string[] = ["種別,日付,金額,説明,タグ"];

    for (const e of expenses) {
      rows.push(
        `支出,${e.expenseDate.toISOString().slice(0, 10)},${e.amount},${e.description},${e.tags.join("|")}`,
      );
    }
    for (const i of incomes) {
      rows.push(
        `収入,${i.incomeDate.toISOString().slice(0, 10)},${i.amount},${i.description ?? ""},`,
      );
    }

    const csv = rows.join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="export_${circleId}.csv"`,
      },
    });
  } finally {
    // finally で必ず解放されるが、finally 前に process がクラッシュするとロック残留
    exportLocks.delete(lockKey);
  }
}
