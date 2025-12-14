"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import BalanceInputInline from "./BalanceInputInline";
import { CircleRow } from "../dashboard/page";
import Fab from "./Fab";
import { useTimelineScrollContainer } from "./TimeLineScroll";
import TimeLineDel from "./TimeLineDel";

type Row = { id: string; title: string; content: string };

export default function DetailSnapshot({
  circleRows,
  userId,
}: {
  circleRows: CircleRow[];
  userId: string;
}) {
  const [enable, setEnable] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const containerRef = useTimelineScrollContainer();
  const endRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

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

  const ensureEndVisible = (behavior: ScrollBehavior = "auto") => {
    const container = containerRef.current;
    const endEl = endRef.current;
    if (!container || !endEl) return;

    const margin = 12;

    const containerRect = container.getBoundingClientRect();
    const endRect = endEl.getBoundingClientRect();

    // endEl の下端が container の下端より下にある分だけ scrollTop を増やす
    const delta = endRect.bottom - (containerRect.bottom - margin);

    if (delta > 0) {
      container.scrollTo({
        top: container.scrollTop + delta,
        behavior,
      });
    }
  };

  return (
    <ul className="space-y-2">
      {circleRows.map((row) => {
        const latestUserName = row.items[0]?.userName ?? "不明なユーザー";
        const latestUserImage = row.items[0]?.userImage;
        const latestAt = row.latestAt;

        return (
          <li key={row.circleId}>
            <details
              ref={detailsRef}
              key={row.circleId}
              open={openId === row.circleId}
              onToggle={(e) => {
                const ect = e.currentTarget;
                if (!ect) return;

                if (ect.open) {
                  setOpenId(ect.open ? row.circleId : null);
                }
                const container = containerRef.current;
                const details = detailsRef.current;
                const endEl = endRef.current;
                if (!details || !container || !endEl) return;

                let tries = 0;
                const pump = () => {
                  if (!details.open) return;
                  ensureEndVisible(tries === 0 ? "auto" : "auto"); // 初回はauto推奨（smoothだとズレ残ることがある）
                  tries += 1;
                  if (tries < 10) requestAnimationFrame(pump);
                };
                requestAnimationFrame(pump);

                const content = contentRef.current;
                if (!content) return;
              }}
              className="group rounded-2xl bg-slate-200"
            >
              <summary className="list-none cursor-pointer px-3 py-2 hover:bg-slate-800 transition-colors rounded-2xl">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-600">
                      {row.circleName}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-800">
                      {formatDateTime(latestAt)}
                      {/* イベント {row.count}件 */}
                    </div>
                  </div>

                  {/* 右：更新情報 */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* 最新残高 */}
                    <span className="text-[12px] font-semibold text-sky-800">
                      {row.latestAmount != null
                        ? `¥ ${formatYen(row.latestAmount)}`
                        : "—"}
                    </span>

                    {/* 更新者 */}
                    <div className="flex items-center gap-1">
                      <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center">
                        {latestUserImage ? (
                          <Image
                            src={latestUserImage}
                            alt={latestUserName}
                            width={32}
                            height={32}
                            className="w-8 h-8 object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-800">
                            {latestUserName.slice(0, 2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 group-open:rotate-180 transition-transform">
                      ▼
                    </span>
                  </div>
                </div>
              </summary>

              <div className="grid transition-[grid-template-rows] duration-300 ease-out grid-rows-[0fr] group-open:grid-rows-[1fr]">
                <div className="overflow-hidden">
                  <div className="transition-opacity duration-300 ease-out opacity-0 group-open:opacity-100"></div>

                  <div className="mt-1 border-t border-slate-700/50 px-3 py-2 space-y-2">
                    <Link href={`/circles/${row.circleId}`}>
                      <div className="mb-2 text-xs text-slate-1000">
                        {row.circleName}の詳細ページへ移動
                      </div>
                    </Link>

                    {/* 投稿詳細（チャット風） */}

                    {row.items.map((e, index) => (
                      <div key={e.id} className="flex gap-2 items-start">
                        <div className="w-7 h-7 rounded-full bg-slate-400 overflow-hidden flex items-center justify-center shrink-0">
                          {e.userImage ? (
                            <Image
                              src={e.userImage}
                              alt={e.userName}
                              width={28}
                              height={28}
                              className="w-7 h-7 object-cover"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-600">
                              {e.userName.slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-baseline gap-1">
                            <span className="text-xs font-semibold text-slate-600">
                              {e.userName}
                            </span>
                            <span className="text-[10px] text-sky-800">
                              {formatDateTime(e.at)}
                            </span>
                          </div>

                          <div className="relative mt-1 inline-block w-full rounded-2xl bg-slate-400 px-3 py-2">
                            {e.kind === "snapshot" && userId === e.userId ? (
                              <TimeLineDel row={e} />
                            ) : null}
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              {e.kind === "snapshot" && (
                                <>
                                  <span className="text-[11px] text-sky-800">
                                    残高更新
                                  </span>

                                  <span className="text-[12px] font-semibold text-sky-800">
                                    ¥ {formatYen(e.amount)}
                                  </span>
                                </>
                              )}
                            </div>
                            {e.kind === "snapshot" && e.memo && (
                              <>
                                <span className="text-[11px] text-sky-800">
                                  残高更新
                                </span>

                                <p className="text-xs text-sky-800">{e.memo}</p>
                              </>
                            )}

                            {e.kind === "join" && (
                              <p className="text-xs text-sky-800">
                                サークルに参加しました。
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="pt-2">
                      <BalanceInputInline
                        circleId={row.circleId}
                        enable={enable}
                        setEnable={setEnable}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </details>
            <div ref={endRef} />
          </li>
        );
      })}
      <Fab enable={enable} setEnable={setEnable} />
    </ul>
  );
}
