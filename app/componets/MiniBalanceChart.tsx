"use client";

export type BalanceDataPoint = {
  date: string; // ISO string
  balance: number;
};

type Props = {
  data: BalanceDataPoint[];
  onClose: () => void;
};

function formatYen(n: number) {
  return new Intl.NumberFormat("ja-JP").format(n);
}

export default function MiniBalanceChart({ data, onClose }: Props) {
  if (data.length < 2) return null;

  const values = data.map((d) => d.balance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const W = 300;
  const H = 52;
  const pad = 5;

  const coords = data.map((d, i) => ({
    x: pad + (i / (data.length - 1)) * (W - pad * 2),
    y: pad + ((max - d.balance) / range) * (H - pad * 2),
  }));

  const polylinePoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");

  // 面グラデーション用パス
  const first = coords[0];
  const last = coords[coords.length - 1];
  const areaPath = [
    `M ${first.x.toFixed(1)},${first.y.toFixed(1)}`,
    ...coords.slice(1).map((c) => `L ${c.x.toFixed(1)},${c.y.toFixed(1)}`),
    `L ${last.x.toFixed(1)},${(H - pad).toFixed(1)}`,
    `L ${first.x.toFixed(1)},${(H - pad).toFixed(1)}`,
    "Z",
  ].join(" ");

  const firstBalance = data[0].balance;
  const lastBalance = data[data.length - 1].balance;
  const diff = lastBalance - firstBalance;
  const isUp = diff >= 0;
  const lineColor = isUp ? "#16a34a" : "#dc2626";
  const areaColor = isUp ? "#dcfce7" : "#fee2e2";

  const lastCoord = coords[coords.length - 1];

  return (
    <div className="relative mx-3 mb-1 bg-white rounded-xl border border-slate-200 px-3 pt-2 pb-2 shadow-sm">
      {/* バツボタン */}
      <button
        onClick={onClose}
        className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition text-[11px] leading-none"
        aria-label="閉じる"
      >
        ✕
      </button>

      <div className="text-[10px] text-slate-400 mb-1 pr-6">直近30日間の残高推移</div>

      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ height: 52 }}
      >
        {/* 面グラデーション */}
        <path d={areaPath} fill={areaColor} opacity="0.5" />
        {/* 折れ線 */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={lineColor}
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* 最新ポイント */}
        <circle cx={lastCoord.x} cy={lastCoord.y} r="3.5" fill={lineColor} />
      </svg>

      <div className="flex items-center justify-between mt-0.5">
        <span className="text-[10px] text-slate-400">
          ¥{formatYen(min)} ~ ¥{formatYen(max)}
        </span>
        <span
          className={`text-xs font-semibold ${isUp ? "text-green-600" : "text-red-500"}`}
        >
          {isUp ? "↗" : "↘"} {diff > 0 ? "+" : ""}
          {formatYen(diff)}
        </span>
      </div>
    </div>
  );
}
