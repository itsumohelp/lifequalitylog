import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Fab from "@/app/componets/Fab";
import TimeLineScroll from "../componets/TimeLineScroll";
import Link from "next/link";
import DetailSnapshot from "../componets/DetailSnapshot";

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

export type CircleRow = {
  circleId: string;
  circleName: string;
  latestAt: Date;
  latestAmount?: number | null; // snapshotがない場合はnull
  latestKind: TimelineEvent["kind"];
  count: number;
  items: TimelineEvent[];
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
  let circleRows: CircleRow[] = [];

  if (hasCircles) {
    const snapshots = await prisma.circleSnapshot.findMany({
      where: { circleId: { in: circleIds } },
      include: {
        circle: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { createdAt: "asc" }, // ここはサマリに寄せてdesc推奨
      take: 200,
    });

    const snapshotEvents: TimelineEvent[] = snapshots.map((s) => ({
      id: `snapshot-${s.id}`,
      kind: "snapshot",
      at: s.createdAt,
      userName: s.user?.name || s.user?.email || "不明なユーザー",
      userImage: s.user?.image,
      circleName: s.circle.name,
      amount: s.amount,
      note: s.note ?? undefined,
      circleId: s.circleId,
    }));

    // joinイベントも取得
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

    // 全イベント（必要ならデバッグ用に残す）
    events = [...joinEvents, ...snapshotEvents].sort(
      (a, b) => b.at.getTime() - a.at.getTime(),
    );

    // circleごとにサマリ（1行）を作る
    const byCircle = new Map<string, TimelineEvent[]>();
    for (const e of events) {
      if (!byCircle.has(e.circleId)) byCircle.set(e.circleId, []);
      byCircle.get(e.circleId)!.push(e);
    }

    const rows: CircleRow[] = [];

    for (const [circleId, items] of byCircle.entries()) {
      const sorted = [...items].sort((b, a) => a.at.getTime() - b.at.getTime());
      const latest = sorted[sorted.length - 1];

      const last3Item = sorted.slice(0, 3).reverse();

      // 最新snapshotのamountをサマリに出す（joinが最新でも、amountは直近snapshotから拾う）
      const latestSnapshot = sorted.find((x) => x.kind === "snapshot") as
        | Extract<TimelineEvent, { kind: "snapshot" }>
        | undefined;

      rows.push({
        circleId,
        circleName: latest.circleName,
        latestAt: latest.at,
        latestKind: latest.kind,
        latestAmount: latestSnapshot ? latestSnapshot.amount : null,
        count: sorted.length,
        items: last3Item,
      });
    }

    // サークル行は「最新更新順」
    circleRows = rows.sort(
      (b, a) => b.latestAt.getTime() - a.latestAt.getTime(),
    );
  }

  const latestSnapshots = await prisma.snapshot.findMany({
    where: { circleId: { in: circleIds } },
    orderBy: { createdAt: "asc" },
    distinct: ["circleId"],
    include: {
      circle: { select: { id: true, name: true } },
    },
  });
  const hasRows = circleRows.length > 0;

  return (
    <>
      <div className="h-full">
        <div className="mx-auto max-w-md px-4 pt-4 pb-2 flex flex-col h-full">
          <header className="mb-1 shrink-0">
            <div className="flex items-center justify-between">
              <h1 className="text-sm font-semibold text-sky-100">
                みんなのお金のタイムライン
              </h1>
            </div>
          </header>

          {/* ===== 上部：サークル残高サマリ（横スクロール） ===== */}
          <section className="mt-2 mb-3">
            <h2 className="text-[11px] text-slate-400 mb-2">サークル残高</h2>

            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {latestSnapshots.map((s) => (
                <div
                  key={s.circleId}
                  className="min-w-[220px] shrink-0 rounded-2xl bg-slate-800/80 px-3 py-2"
                >
                  <Link href={`/circles/${s.circleId}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-slate-100">
                          {s.circle.name}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          最終更新: {formatDateTime(s.createdAt)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[12px] font-semibold text-sky-200">
                          ¥ {formatYen(s.amount)}
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}

              {/* スナップショットが1件もないサークルも出したい場合は、ここで補完表示します（必要なら書きます） */}
            </div>
          </section>

          {/* タイムライン本体：ここだけスクロール */}
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
            ) : !hasRows ? (
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
              <DetailSnapshot circleRows={circleRows} />
            )}
          </TimeLineScroll>

          <footer className="mt-3 shrink-0"></footer>
        </div>
      </div>
    </>
  );
}
