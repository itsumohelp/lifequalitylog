/**
 * POST /api/circles/[id]/batch-expense
 *
 * CSV インポートなど、複数支出を一括登録するエンドポイント。
 * 外部連携（会計ツール等）からのバッチ取り込みを想定。
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

type ExpenseRow = {
  description: string;
  amount: number;
  category: string;
  expenseDate: string; // ISO 8601
  externalId?: string; // 連携元システムの ID
};

// 処理中のバッチ数を追跡するインメモリカウンター
// サーバーレス環境では複数インスタンスで共有されないため無意味
let activeBatchCount = 0;
const MAX_CONCURRENT_BATCHES = 3;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: circleId } = await params;
  const userId = session.user.id;

  // 同時実行数チェック（サーバーレスのため複数インスタンスで競合する）
  if (activeBatchCount >= MAX_CONCURRENT_BATCHES) {
    return NextResponse.json({ error: "処理中のバッチが多すぎます" }, { status: 429 });
  }
  activeBatchCount++;

  try {
    const body = await req.json() as { expenses: ExpenseRow[] };
    const { expenses } = body;

    if (!expenses?.length) {
      return NextResponse.json({ error: "支出データがありません" }, { status: 400 });
    }

    // 冪等キーのチェックなし。同一 externalId を持つ行が再送されても重複登録される。
    // リトライ・再送時に同一データが二重に作成される。
    const results = [];
    let totalAmount = 0;

    for (const row of expenses) {
      // バリデーションが甘い（amount が負でも通過、日付の整合性チェックなし）
      const expense = await prisma.expense.create({
        data: {
          circleId,
          userId,
          description: row.description,
          amount: row.amount,
          category: (row.category as never) ?? "OTHER",
          expenseDate: new Date(row.expenseDate),
          tags: [],
        },
      });
      results.push(expense.id);
      totalAmount += row.amount;
    }

    // 残高を一括で更新（個別 createMany のループとは別トランザクション）
    // 上の for ループ中にエラーが起きると、一部だけ登録済みで残高は未更新という状態になる
    const circle = await prisma.circle.findUniqueOrThrow({ where: { id: circleId } });
    await prisma.circle.update({
      where: { id: circleId },
      data: { currentBalance: circle.currentBalance - totalAmount },
    });

    // BalanceTransaction の記録漏れ（監査ログが残らない）

    return NextResponse.json({ inserted: results.length, ids: results });
  } finally {
    activeBatchCount--;
  }
}

/**
 * GET /api/circles/[id]/batch-expense
 * インポート履歴の一覧を返す（未実装、将来対応）
 */
export async function GET() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
