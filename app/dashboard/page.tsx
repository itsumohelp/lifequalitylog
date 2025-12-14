import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import TimeLineScroll from "../componets/TimeLineScroll";
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

export type TimelineEvent =
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
      snapshotId: string;
      userId?: string;
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
  id: string;
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
  let allMasnagedCircles: number = 0;

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
      userId: s.userId,
      snapshotId: s.id,
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
        id: latest.id,
        circleId,
        circleName: latest.circleName,
        latestAt: latest.at,
        latestKind: latest.kind,
        latestAmount: latestSnapshot ? latestSnapshot.amount : null,
        count: sorted.length,
        items: last3Item,
      });
      allMasnagedCircles +=
        latestSnapshot && latestSnapshot.amount ? latestSnapshot.amount : 0;
    }

    // サークル行は「最新更新順」
    circleRows = rows.sort(
      (b, a) => b.latestAt.getTime() - a.latestAt.getTime(),
    );
  }

  const hasRows = circleRows.length > 0;

  return (
    <>
      <div className="h-full bg-slate-50">
        <div className="mx-auto max-w-md px-1 pt-2 pb-2 flex flex-col h-full">
          <header className="mb-1 shrink-0">
            <div className="flex items-center justify-between">
              <h1 className="text-sm font-semibold text-sky-900">
                管理するサークルの合計
              </h1>
            </div>
          </header>

          {/* ===== 上部：サークル残高サマリ（横スクロール） ===== */}
          <section className="mt-1 mb-1">
            <div className="overflow-x-auto pb-2 -mx-1 px-1">
              <div className="shrink-0 rounded-2xl bg-slate-800/80 px-3 py-2">
                <div className="font-semibold text-sky-200 text-4xl text-center">
                  ¥ {formatYen(allMasnagedCircles)}
                </div>
              </div>
            </div>
          </section>

          {/* タイムライン本体：ここだけスクロール */}
          <h1 className="text-sm font-semibold text-sky-900">
            各サークルの記録
          </h1>
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
              <DetailSnapshot
                circleRows={circleRows}
                userId={session?.user?.id}
              />
            )}
          </TimeLineScroll>

          <footer className="mt-3 shrink-0"></footer>
        </div>
      </div>
    </>
  );
}
