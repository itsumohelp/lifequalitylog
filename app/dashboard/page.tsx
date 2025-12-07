// app/dashboard/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import Fab from "@/app/componets/Fab";
import TimeLineScroll from "../componets/TimeLineScroll";

function formatYen(amount: number) {
  return new Intl.NumberFormat("ja-JP").format(amount);
}

function formatDateTime(date: Date) {
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(date: Date) {
  return date.toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });
}

type TimelineEvent =
  | {
      id: string;
      kind: "snapshot";
      at: Date;
      userName: string;
      userImage?: string | null;
      circleName: string;
      amount: number;
      memo?: string | null;
      circleId: string;
    }
  | {
      id: string;
      kind: "join";
      at: Date;
      userName: string;
      userImage?: string | null;
      circleName: string;
      circleId: string;
    };

export default async function DashboardPage() {
  const session = await auth();
  if (!session || !session.user?.id) {
    redirect("/");
  }

  const userId = session.user.id as string;

  const memberships = await prisma.circleMember.findMany({
    where: { userId },
    select: { circleId: true },
  });

  const circleIds = memberships.map((m) => m.circleId);
  const hasCircles = circleIds.length > 0;

  let events: TimelineEvent[] = [];
  let circleSummaries:
    | {
        circleId: string;
        circleName: string;
        amount: number;
        createdAt: Date;
      }[]
    | [] = [];

  if (hasCircles) {
    const snapshots = await prisma.snapshot.findMany({
      where: { circleId: { in: circleIds } },
      include: {
        circle: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    const latestByCircle = new Map<
      string,
      { circleId: string; circleName: string; amount: number; createdAt: Date }
    >();

    for (const s of snapshots) {
      latestByCircle.set(s.circleId, {
        circleId: s.circleId,
        circleName: s.circle.name,
        amount: s.amount,
        createdAt: s.createdAt,
      });
    }

    circleSummaries = Array.from(latestByCircle.values());

    const snapshotEvents: TimelineEvent[] = snapshots.map((s) => ({
      id: `snapshot-${s.id}`,
      kind: "snapshot",
      at: s.createdAt,
      userName: s.user?.name || s.user?.email || "不明なユーザー",
      userImage: s.user?.image,
      circleName: s.circle.name,
      amount: s.amount,
      memo: s.memo ?? undefined,
      circleId: s.circleId,
    }));

    const joins = await prisma.circleMember.findMany({
      where: { circleId: { in: circleIds } },
      include: {
        circle: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { joinedAt: "asc" },
      take: 200,
    });

    const joinEvents: TimelineEvent[] = joins.map((m) => ({
      id: `join-${m.id}`,
      kind: "join",
      at: m.joinedAt,
      userName: m.user?.name || m.user?.email || "不明なユーザー",
      userImage: m.user?.image,
      circleName: m.circle.name,
      circleId: m.circleId,
    }));

    events = [...snapshotEvents, ...joinEvents].sort(
      (a, b) => a.at.getTime() - b.at.getTime(),
    );
  }

  const hasEvents = events.length > 0;
  const hasSummaries = circleSummaries.length > 0;

  return (
    <>
      {/* layout.tsx の <main className="flex-1"> の高さをまるっと受け取る */}
      <div className="h-full">
        {/* 中央寄せ＆上下余白、ここでタイムラインを縦に分割 */}
        <div className="mx-auto max-w-md px-4 pt-4 pb-10 flex flex-col h-full">
          {/* ページ内ヘッダー */}
          <header className="mb-3 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <h1 className="text-sm font-semibold text-sky-100">
                みんなのお金のタイムライン
              </h1>
            </div>
            <p className="text-[11px] text-slate-400">
              サークルの残高記録と、参加イベントが時系列で流れます。
            </p>
          </header>

          {/* サークルサマリ（横スクロール） */}
          {hasCircles && hasSummaries && (
            <section className="mb-3 shrink-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-400">
                  サークル別の最新残高
                </span>
              </div>
              <div className="-mx-1 px-1 pb-1 overflow-x-auto no-scrollbar">
                <div className="flex gap-2">
                  {circleSummaries.map((c) => (
                    <Link
                      key={c.circleId}
                      href={`/circles/${c.circleId}`}
                      className="min-w-[150px] max-w-[180px] rounded-2xl bg-slate-900/70 border border-slate-800 px-3 py-2 flex-shrink-0 hover:border-sky-500/70 transition-colors"
                    >
                      <div className="text-[11px] font-semibold text-sky-100 truncate">
                        {c.circleName}
                      </div>
                      <div className="mt-1 text-[13px] font-bold text-sky-300">
                        ¥ {formatYen(c.amount)}
                      </div>
                      <div className="mt-0.5 text-[10px] text-slate-500">
                        更新: {formatDateShort(c.createdAt)}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* タイムライン本体：ここだけがスクロール */}
          <TimeLineScroll>
            {!hasCircles ? (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <p className="text-xs text-slate-300 mb-1">
                    まだサークルに参加していません。
                  </p>
                  <p className="text-[11px] text-slate-500">
                    まずはサークルを作成するか、招待リンクから参加してください。
                  </p>
                </div>
              </div>
            ) : !hasEvents ? (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <p className="text-xs text-slate-300 mb-1">
                    まだイベントがありません。
                  </p>
                  <p className="text-[11px] text-slate-500 mb-1">
                    残高を登録すると記録が、招待リンクから参加すると参加イベントが
                    ここに流れます。
                  </p>
                </div>
              </div>
            ) : (
              <ul className="space-y-2">
                {events.map((e) => (
                  <li key={e.id} className="flex gap-2 items-start">
                    <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                      {e.userImage ? (
                        <Image
                          src={e.userImage}
                          alt={e.userName}
                          width={32}
                          height={32}
                          className="w-8 h-8 object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-200">
                          {e.userName.slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-semibold text-slate-100">
                          {e.userName}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {formatDateTime(e.at)}
                        </span>
                      </div>

                      <Link
                        key={e.circleId}
                        href={`/circles/${e.circleId}`}
                        className="mt-1 inline-block rounded-2xl bg-slate-800/80 px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-[11px] text-sky-300">
                            {e.circleName}
                          </span>

                          {e.kind === "snapshot" && (
                            <span className="text-[12px] font-semibold text-sky-200">
                              ¥ {formatYen(e.amount)}
                            </span>
                          )}
                        </div>

                        {e.kind === "snapshot" && e.memo && (
                          <p className="text-xs text-slate-100">{e.memo}</p>
                        )}

                        {e.kind === "join" && (
                          <p className="text-xs text-slate-100">
                            このサークルに参加しました。
                          </p>
                        )}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TimeLineScroll>

          <footer className="mt-2 text-[10px] text-slate-500 shrink-0">
            ※ 新しいイベントほど下に表示されます。
            記録フリークのみなさん、無理のない頻度でどうぞ。
          </footer>
        </div>
      </div>

      {/* 右下のフローティング＋ボタン */}
      <Fab />
    </>
  );
}
