// app/circles/[id]/page.tsx
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import type { CircleRole } from "@prisma/client";

function roleLabel(role: CircleRole) {
  switch (role) {
    case "ADMIN":
      return "管理者";
    case "EDITOR":
      return "登録者";
    case "VIEWER":
      return "参照者";
    default:
      return role;
  }
}

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

function isOlderThan3Years(date: Date) {
  const now = new Date();
  const threeYearsAgo = new Date(
    now.getFullYear() - 3,
    now.getMonth(),
    now.getDate()
  );
  return date < threeYearsAgo;
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CircleDetailPage({ params }: Props) {
  const session = await auth();
  if (!session || !session.user?.id) {
    redirect("/");
  }
  const userId = session.user.id as string;
  const resolvedParams = await params;
  const circleId = resolvedParams.id;

  // サークル + メンバー情報を取得
  const circle = await prisma.circle.findUnique({
    where: { id: circleId },
    include: {
      members: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!circle) {
    notFound();
  }

  // 自分のメンバーシップを確認（未参加ならアクセス不可）
  const myMembership = circle.members.find((m) => m.userId === userId);
  if (!myMembership) {
    // 参加していないサークルにはアクセスできない
    redirect("/circles");
  }

  // このサークルの残高スナップショット一覧
  const snapshots = await prisma.snapshot.findMany({
    where: { circleId },
    orderBy: { recordedAt: "desc" },
    include: {
      user: true,
    },
  });

  const memberCount = circle.members.length;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-md px-4 pt-4 pb-10">
        {/* ヘッダー */}
        <header className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <Link href="/circles" className="text-xs text-sky-300">
              ← サークル一覧
            </Link>
            <h1 className="text-sm font-semibold text-sky-100 line-clamp-1">
              {circle.name}
            </h1>
            <span className="text-[10px] text-slate-400">
              {roleLabel(myMembership.role)}
            </span>
          </div>

          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 px-3 py-3 mb-3">
            {circle.walletName && (
              <p className="text-xs text-sky-300 mb-1">
                ウォレット: {circle.walletName}
              </p>
            )}
            {circle.description && (
              <p className="text-[11px] text-slate-200 mb-1">
                {circle.description}
              </p>
            )}
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-slate-500">
                メンバー {memberCount} / 50
              </span>
              <span className="text-[10px] text-slate-500">
                通貨: {circle.currency}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-400">
              このサークルの残高スナップショットを時系列で表示します。
            </p>
            {/* ここは将来 /circles/[id]/snapshots/new を作ったら差し替える */}
            <Link
              href={`/circles/${circleId}/snapshots/new`}
              className="ml-2 text-[11px] text-sky-300"
            >
              ＋ 残高を追加
            </Link>
          </div>
        </header>

        {/* タイムライン */}
        {snapshots.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-6 text-center">
            <p className="text-xs text-slate-300 mb-2">
              まだこのサークルのスナップショットがありません。
            </p>
            <p className="text-[11px] text-slate-500 mb-4">
              最初の記録として、今日の残高を登録してみましょう。
            </p>
            <Link
              href={`/circles/${circleId}/snapshots/new`}
              className="inline-flex items-center justify-center rounded-2xl bg-sky-500 px-4 py-2 text-xs font-semibold text-white active:scale-[0.98] transition-transform"
            >
              残高を登録する
            </Link>
          </div>
        ) : (
          <section className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xs font-semibold text-slate-300">
                残高タイムライン
              </h2>
              <span className="text-[10px] text-slate-500">
                合計 {snapshots.length} 件
              </span>
            </div>

            <ol className="space-y-2">
              {snapshots.map((s, index) => {
                const isFirst = index === 0;
                const isLocked = isOlderThan3Years(s.recordedAt);
                return (
                  <li
                    key={s.id}
                    className="relative pl-4"
                  >
                    {/* タイムラインの線 */}
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

                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-slate-500">
                          記録者: {s.user?.name || "不明なユーザー"}
                        </p>
                        {isLocked ? (
                          <span className="text-[10px] text-slate-500">
                            3年以上前（編集不可）
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">
                            記録日時: {formatDate(s.createdAt)}
                          </span>
                        )}
                      </div>
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
