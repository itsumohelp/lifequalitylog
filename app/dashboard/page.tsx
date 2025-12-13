// app/dashboard/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Image from "next/image";
import Fab from "@/app/componets/Fab";
import TimeLineScroll from "../componets/TimeLineScroll";
import BalanceInputInline from "../componets/BalanceInputInline";
import Link from "next/link";

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

type CircleRow = {
  circleId: string;
  circleName: string;
  latestAt: Date;
  latestAmount?: number | null; // snapshotがない場合はnull
  latestKind: TimelineEvent["kind"];
  count: number;
  // 展開時に出す詳細（例: 直近20件）
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
      // 既に events が desc なので items も概ねdesc
      const sorted = [...items].sort((b, a) => b.at.getTime() - a.at.getTime());
      const latest = sorted[0];

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
        items: sorted.slice(0, 5), // 展開時は直近20件だけ
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
              <ul className="space-y-2">
                {circleRows.map((row) => {
                  const latestUserName =
                    row.items[0]?.userName ?? "不明なユーザー";
                  const latestUserImage = row.items[0]?.userImage;
                  const latestAt = row.latestAt;

                  return (
                    <li key={row.circleId}>
                      {/* ❗ bg-white を完全に排除 */}
                      <details className="group rounded-2xl bg-slate-800/80">
                        {/* ===== サークル最上位サマリ行 ===== */}
                        <summary className="list-none cursor-pointer px-3 py-2 hover:bg-slate-800 transition-colors rounded-2xl">
                          <div className="flex items-center justify-between gap-2">
                            {/* 左：サークル名 */}
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-slate-100">
                                {row.circleName}
                              </div>
                              <div className="mt-0.5 text-[10px] text-slate-400">
                                イベント {row.count}件
                              </div>
                            </div>

                            {/* 右：更新情報 */}
                            <div className="flex items-center gap-2 shrink-0">
                              {/* 最新残高 */}
                              <span className="text-[12px] font-semibold text-sky-200">
                                {row.latestAmount != null
                                  ? `¥ ${formatYen(row.latestAmount)}`
                                  : "—"}
                              </span>

                              {/* 更新日 */}
                              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                {formatDateShort(latestAt)}
                              </span>

                              {/* 更新者 */}
                              <div className="flex items-center gap-1">
                                <div className="w-6 h-6 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center">
                                  {latestUserImage ? (
                                    <Image
                                      src={latestUserImage}
                                      alt={latestUserName}
                                      width={24}
                                      height={24}
                                      className="w-6 h-6 object-cover"
                                    />
                                  ) : (
                                    <span className="text-[10px] text-slate-200">
                                      {latestUserName.slice(0, 2)}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 max-w-[72px] truncate">
                                  {latestUserName}
                                </span>
                              </div>

                              {/* 展開アイコン */}
                              <span className="text-[10px] text-slate-400 group-open:rotate-180 transition-transform">
                                ▼
                              </span>
                            </div>
                          </div>
                        </summary>

                        {/* ===== 展開エリア ===== */}
                        <div className="mt-1 border-t border-slate-700/50 px-3 py-2 space-y-2">
                          <Link href={`/circles/${row.circleId}`}>
                            <div className="mb-2 text-xs font-semibold text-slate-100">
                              {row.circleName}の詳細ページへ移動
                            </div>
                          </Link>

                          {/* 投稿詳細（チャット風） */}

                          {row.items.map((e) => (
                            <div key={e.id} className="flex gap-2 items-start">
                              <div className="w-7 h-7 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                                {e.userImage ? (
                                  <Image
                                    src={e.userImage}
                                    alt={e.userName}
                                    width={28}
                                    height={28}
                                    className="w-7 h-7 object-cover"
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

                                <div className="mt-1 inline-block w-full rounded-2xl bg-slate-900/60 px-3 py-2">
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
                                    <p className="text-xs text-slate-100">
                                      {e.memo}
                                    </p>
                                  )}

                                  {e.kind === "join" && (
                                    <p className="text-xs text-slate-100">
                                      このサークルに参加しました。
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* ===== 末尾：今日の残高を更新（既存コンポーネント） ===== */}
                          <div className="pt-2">
                            <BalanceInputInline circleId={row.circleId} />
                          </div>
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            )}
          </TimeLineScroll>

          <footer className="mt-3 shrink-0"></footer>
        </div>
      </div>

      <Fab />
    </>
  );
}
