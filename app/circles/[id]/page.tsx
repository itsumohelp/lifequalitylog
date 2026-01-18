// app/circles/[id]/page.tsx
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { CircleRole } from "@/app/generated/prisma/enums";
import InviteButton from "@/app/componets/InviteButton";
import SnapshotsSection from "@/app/circles/[id]/SnapshotsSection";
import type { CircleBalanceSnapshot } from "@/lib/struct";
import Image from "next/image";

function roleLabel(role: CircleRole) {
  switch (role) {
    case CircleRole.ADMIN:
      return "管理者";
    case CircleRole.EDITOR:
      return "登録者";
    case CircleRole.VIEWER:
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
    now.getDate(),
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

  const snapshots: CircleBalanceSnapshot = await prisma.circleSnapshot.findMany(
    {
      where: { circleId },
      orderBy: { createdAt: "asc" },
      include: {
        user: true,
      },
    },
  );

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
            <span className="text-slate-400">
              {roleLabel(myMembership.role)}
            </span>
          </div>

          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 px-3 py-3 mb-3">
            {circle.walletName && (
              <div className="text-xs text-sky-300 mb-1">
                ウォレット: {circle.walletName}
              </div>
            )}
            {circle.description && (
              <div className="text-slate-200 mb-1">{circle.description}</div>
            )}
            <div className="flex items-center justify-between mt-1">
              <span className="text-slate-500">
                メンバー {memberCount} / 50
              </span>
              <span className="text-slate-500">通貨: {circle.currency}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-slate-400">残高を時系列で表示します。</div>
            <InviteButton circleId={circle.id} />
          </div>

          {/* 支出入力へのリンク */}
          <Link
            href={`/circles/${circleId}/expenses`}
            className="mt-3 flex items-center justify-between rounded-2xl bg-sky-900/30 border border-sky-800 px-4 py-3 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">💬</span>
              <div>
                <div className="text-sm font-semibold text-sky-100">
                  支出を入力
                </div>
                <div className="text-xs text-slate-400">
                  チャット形式で記録
                </div>
              </div>
            </div>
            <span className="text-sky-300">→</span>
          </Link>
        </header>

        {/* タイムライン */}
        {snapshots.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-6 text-center">
            <div className="text-xs text-slate-300 mb-2">
              まだこのサークルのスナップショットがありません。
            </div>
            <div className="text-slate-500 mb-4">
              最初の記録として、今日の残高を登録してみましょう。
            </div>
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
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-sm font-semibold text-sky-100">
                  {circle.name || "残高タイムライン"}
                </h1>
              </div>
              <span className="text-slate-500">合計 {snapshots.length} 件</span>
            </div>

            <ol className="space-y-2">
              {snapshots.map((s, index) => {
                const isFirst = index === 0;
                const isLocked = isOlderThan3Years(s.snapshotDate);
                return (
                  <li key={s.id} className="relative pl-4">
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
                          {formatDate(s.createdAt)}
                        </span>
                        <span className="text-xs font-semibold text-sky-300">
                          ¥ {formatYen(s.amount)}
                        </span>
                      </div>

                      {s.note && (
                        <div className="text-xs text-slate-200 mb-1">
                          {s.note}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="text-slate-500">
                          <div className="flex items-center gap-2">
                            <div className="text-[10px] w-6 h-6 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                              {s.user?.image ? (
                                <Image
                                  src={s.user.image}
                                  alt={s.user.name || "User"}
                                  width={32}
                                  height={32}
                                  className="text-[10px] w-6 h-6 object-cover"
                                />
                              ) : s.user.name ? (
                                <span className="text-[10px] text-slate-200">
                                  {s.user.name.slice(0, 2)}
                                </span>
                              ) : (
                                <span className="text-slate-200">User</span>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-baseline gap-1">
                                <span className="text-[12px] text-slate-200">
                                  {s.user?.name || "不明なユーザー"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
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
        <SnapshotsSection circleId={circleId} snapshots={snapshots} />
      </div>
    </main>
  );
}
