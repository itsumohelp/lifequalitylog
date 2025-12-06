import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function NewSnapshotPage({ params }: Props) {
  const session = await auth();
  if (!session || !session.user?.id) {
    redirect("/");
  }

  const resolvedParams = await params;
  const ResCircleId = resolvedParams.id;
  console.log("check circleId in new snapshot page: " + ResCircleId);
  
  
  // サーバーアクション
  async function createSnapshot(formData: FormData) {
    "use server";

    const userId = session!.user!.id as string;

    const amountRaw = formData.get("amount") as string;
    const dateRaw = (formData.get("recordedAt") as string) || "";
    const memo = (formData.get("memo") as string) || "";

    const amount = parseInt(amountRaw, 10);
    if (Number.isNaN(amount)) {
      // TODO: エラー表示をちゃんとやるならフラッシュメッセージなど
      return;
    }

    const recordedAt = dateRaw ? new Date(dateRaw) : new Date();

    await prisma.snapshot.create({
      data: {
        userId,
        amount,
        memo,
        recordedAt,
        circleId: ResCircleId
      },
    });

    revalidatePath("/dashboard");
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-md px-4 pt-4 pb-10">
        {/* ヘッダー（スマホ1行） */}
        <header className="flex items-center justify-between mb-4">
          <Link
            href="/dashboard"
            className="text-xs text-sky-300"
          >
            ← 戻る
          </Link>
          <h1 className="text-sm font-semibold text-sky-100">
            残高スナップショットを追加
          </h1>
          <span className="w-10" />
        </header>

        <p className="text-xs text-slate-400 mb-4">
          いまの口座残高を登録しておくと、あとで
          <span className="text-sky-300">「お金のタイムライン」</span>
          として振り返ることができます。
        </p>

        <form action={createSnapshot} className="space-y-4">
          {/* 金額入力 */}
          <div>
            <label
              htmlFor="amount"
              className="block text-xs font-medium text-slate-200 mb-1"
            >
              残高（金額）
            </label>
            <div className="flex items-center rounded-xl bg-slate-900 border border-slate-700 px-3 py-2">
              <input
                id="amount"
                name="amount"
                type="number"
                inputMode="numeric"
                placeholder="例: 120000"
                className="flex-1 bg-transparent text-sm outline-none text-slate-50 placeholder:text-slate-500"
                required
              />
              <span className="ml-2 text-xs text-slate-400">円</span>
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              財布・口座など、このサークルで管理したい合計額をざっくりでOKです。
            </p>
          </div>

          {/* 日付入力 */}
          <div>
            <label
              htmlFor="recordedAt"
              className="block text-xs font-medium text-slate-200 mb-1"
            >
              この残高の日付
            </label>
            <input
              id="recordedAt"
              name="recordedAt"
              type="date"
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-50 outline-none"
            />
            <p className="mt-1 text-[10px] text-slate-500">
              未入力なら「今日」の残高として登録されます。
            </p>
          </div>

          {/* メモ */}
          <div>
            <label
              htmlFor="memo"
              className="block text-xs font-medium text-slate-200 mb-1"
            >
              メモ（任意）
            </label>
            <textarea
              id="memo"
              name="memo"
              rows={2}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-50 outline-none resize-none"
              placeholder="例: 給料日後の残高 / 旅行前にいくら用意したか など"
            />
          </div>

          {/* 送信ボタン（スマホ大きめ） */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full rounded-2xl bg-sky-500 text-white text-sm font-semibold py-3 active:scale-[0.99] transition-transform disabled:opacity-60"
            >
              この内容で登録する
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
