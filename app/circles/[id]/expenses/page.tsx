import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import ExpenseChat from "./ExpenseChat";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ExpensesPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const { id: circleId } = await params;

  // サークル情報を取得
  const circle = await prisma.circle.findUnique({
    where: { id: circleId },
    include: {
      members: {
        where: { userId: session.user.id },
      },
    },
  });

  if (!circle) {
    notFound();
  }

  // メンバーか確認
  if (circle.members.length === 0) {
    redirect("/circles");
  }

  const myRole = circle.members[0].role;

  // 支出一覧を取得
  const expenses = await prisma.expense.findMany({
    where: { circleId },
    orderBy: { expenseDate: "asc" },
    include: {
      user: {
        select: { name: true, image: true },
      },
    },
  });

  // 今月の合計
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthTotal = expenses
    .filter((e) => new Date(e.expenseDate) >= startOfMonth)
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-md">
        {/* ヘッダー */}
        <header className="sticky top-0 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3 z-10">
          <div className="flex items-center justify-between">
            <Link
              href={`/circles/${circleId}`}
              className="text-sky-300 text-sm"
            >
              ← 戻る
            </Link>
            <h1 className="text-sm font-semibold">{circle.name}</h1>
            <div className="w-12" />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-slate-400">今月の支出</span>
            <span className="text-sky-300 font-semibold">
              ¥{new Intl.NumberFormat("ja-JP").format(thisMonthTotal)}
            </span>
          </div>
        </header>

        {/* チャットUI */}
        {myRole === "VIEWER" ? (
          <div className="p-4 text-center text-slate-400">
            <p>閲覧権限のため支出の登録はできません</p>
          </div>
        ) : (
          <ExpenseChat
            circleId={circleId}
            initialExpenses={expenses.map((e) => ({
              id: e.id,
              amount: e.amount,
              description: e.description,
              place: e.place,
              category: e.category,
              expenseDate: e.expenseDate.toISOString(),
              user: {
                name: e.user.name,
                image: e.user.image,
              },
            }))}
          />
        )}
      </div>
    </main>
  );
}
