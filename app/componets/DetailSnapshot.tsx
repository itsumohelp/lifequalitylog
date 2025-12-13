"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import BalanceInputInline from "./BalanceInputInline";
import { CircleRow } from "../dashboard/page";
import Fab from "./Fab";

type Row = { id: string; title: string; content: string };

export default function DetailSnapshot({
  circleRows,
}: {
  circleRows: CircleRow[];
}) {
  const [enable, setEnable] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
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
  return (
    <ul className="space-y-2">
      {circleRows.map((row) => {
        const latestUserName = row.items[0]?.userName ?? "不明なユーザー";
        const latestUserImage = row.items[0]?.userImage;
        const latestAt = row.latestAt;

        return (
          <li key={row.circleId}>
            {/* ❗ bg-white を完全に排除 */}
            <details
              ref={detailsRef}
              key={row.circleId}
              open={openId === row.circleId}
              onToggle={(e) => {
                const el = e.currentTarget;
                if (!el) return;

                if (el.open) {
                  setOpenId(el.open ? row.circleId : null);
                }
              }}
              className="group rounded-2xl bg-slate-800/80"
            >
              {/* ===== サークル最上位サマリ行 ===== */}
              <summary className="list-none cursor-pointer px-3 py-2 hover:bg-slate-800 transition-colors rounded-2xl">
                <div className="flex items-center justify-between gap-2">
                  {/* 左：サークル名 */}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-100">
                      {row.circleName}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-400">
                      {formatDateTime(latestAt)}
                      {/* イベント {row.count}件 */}
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
                          <span className="text-[10px] text-slate-200">
                            {latestUserName.slice(0, 2)}
                          </span>
                        )}
                      </div>
                      {/* <span className="text-[10px] text-slate-400 max-w-[72px] truncate">
                        {latestUserName}
                      </span> */}
                    </div>

                    {/* 展開アイコン */}
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
                              {e.kind === "snapshot" && (
                                <>
                                  <span className="text-[11px] text-sky-300">
                                    残高更新
                                  </span>

                                  <span className="text-[12px] font-semibold text-sky-200">
                                    ¥ {formatYen(e.amount)}
                                  </span>
                                </>
                              )}
                            </div>

                            {e.kind === "snapshot" && e.memo && (
                              <>
                                <span className="text-[11px] text-sky-300">
                                  残高更新
                                </span>

                                <p className="text-xs text-slate-100">
                                  {e.memo}
                                </p>
                              </>
                            )}

                            {e.kind === "join" && (
                              <p className="text-xs text-slate-100">
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
          </li>
        );
      })}
      <Fab enable={enable} setEnable={setEnable} />
    </ul>
  );
}
