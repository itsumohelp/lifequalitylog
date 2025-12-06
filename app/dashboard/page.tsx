import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";

function formatYen(amount: number) {
  return new Intl.NumberFormat("ja-JP").format(amount);
}

function formatDate(date: Date) {
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function SnapshotsPage() {
  const session = await auth();
  if (!session || !session.user?.id) {
    redirect("/");
  }

  const userId = session.user.id as string;

  const snapshots = await prisma.snapshot.findMany({
    where: { userId },
    orderBy: { recordedAt: "desc" },
    // 必要に応じて件数制御（とりあえず多めに）
    // take: 100,
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-md px-4 pt-4 pb-10">
        {/* ヘッダー */}
        <header className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <Link
              href="/dashboard"
              className="text-xs text-sky-300"
            >
              ← ダッシュボード
            </Link>
            <h1 className="text-sm font-semibold text-sky-100">
              残高タイムライン
            </h1>
            <Link
              href="/snapshots/new"
              className="text-[11px] text-sky-300"
            >
              ＋ 追加
            </Link>
          </div>
          <p className="text-[11px] text-slate-400">
            これまで登録してきた残高スナップショットを、
            時系列で振り返ることができます。
          </p>
        </header>

        {/* コンテンツ */}
        {snapshots.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-6 text-center">
            <p className="text-xs text-slate-300 mb-2">
              まだスナップショットがありません。
            </p>
            <p className="text-[11px] text-slate-500 mb-4">
              はじめての記録として、今日の残高を登録してみましょう。
            </p>
            <Link
              href="/snapshots/new"
              className="inline-flex items-center justify-center rounded-2xl bg-sky-500 px-4 py-2 text-xs font-semibold text-white active:scale-[0.98] transition-transform"
            >
              残高を登録する
            </Link>
          </div>
        ) : (
          <section className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-slate-300">
                すべての記録
              </h2>
              <span className="text-[10px] text-slate-500">
                合計 {snapshots.length} 件
              </span>
            </div>

            <ol className="space-y-2">
              {snapshots.map((s, index) => {
                const isFirst = index === 0;
                return (
                  <li
                    key={s.id}
                    className="relative pl-4"
                  >
                    {/* タイムラインの縦線 */}
                    <div className="absolute left-1 top-0 bottom-0 flex flex-col items-center">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isFirst ? "bg-sky-400" : "bg-slate-500"
                        }`}
                      />
                      <span className="flex-1 w-px bg-slate-700 mt-1" />
                    </div>

                    <article className="ml-2 rounded-2xl bg-slate-900/60 border border-slate-800 px-4 py-3">
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-[11px] text-slate-400">
                          {formatDate(s.recordedAt)}
                        </span>
                        <span className="text-xs font-semibold text-sky-300">
                          ¥ {formatYen(s.amount)}
                        </span>
                      </div>
                      {s.memo && (
                        <p className="text-xs text-slate-200 mb-1">
                          {s.memo}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-500">
                        記録日時:{" "}
                        {formatDate(s.createdAt ?? s.recordedAt)}
                      </p>
                    </article>
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </div>
    </main>
  );
}
