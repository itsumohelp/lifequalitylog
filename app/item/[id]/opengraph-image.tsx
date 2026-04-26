import { ImageResponse } from "next/og";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = {
  params: Promise<{ id: string }>;
};

async function fetchNotoSansJP(text: string): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=${encodeURIComponent(text)}`;
    const css = await fetch(cssUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      next: { revalidate: 86400 },
    }).then((r) => r.text());
    const match = css.match(/src: url\((.+?)\)/);
    if (!match) return null;
    return fetch(match[1], { next: { revalidate: 86400 } }).then((r) =>
      r.arrayBuffer()
    );
  } catch {
    return null;
  }
}

function toJST(date: Date): string {
  return date.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function Image({ params }: Props) {
  const { id } = await params;

  const dashIndex = id.indexOf("-");
  if (dashIndex === -1) return new Response("Not found", { status: 404 });

  const type = id.substring(0, dashIndex);
  const rawId = id.substring(dashIndex + 1);

  let circleName = "CircleRun";
  let amount: number | null = null;
  let createdAt: Date = new Date();
  let kindLabel = "記録しました";
  let amountColor = "#94a3b8";

  try {
    if (type === "expense") {
      const row = await prisma.expense.findUnique({
        where: { id: rawId },
        include: { circle: { select: { name: true } } },
      });
      if (row) {
        circleName = row.circle.name;
        amount = row.amount;
        createdAt = row.createdAt;
        kindLabel = "支出を記録しました";
        amountColor = "#f87171";
      }
    } else if (type === "income") {
      const row = await prisma.income.findUnique({
        where: { id: rawId },
        include: { circle: { select: { name: true } } },
      });
      if (row) {
        circleName = row.circle.name;
        amount = row.amount;
        createdAt = row.createdAt;
        kindLabel = "収入を記録しました";
        amountColor = "#4ade80";
      }
    } else if (type === "snapshot") {
      const row = await prisma.circleSnapshot.findUnique({
        where: { id: rawId },
        include: { circle: { select: { name: true } } },
      });
      if (row) {
        circleName = row.circle.name;
        amount = row.amount;
        createdAt = row.createdAt;
        kindLabel = "残高を記録しました";
        amountColor = "#94a3b8";
      }
    } else if (type === "notification") {
      const row = await prisma.notification.findUnique({
        where: { id: rawId },
        include: { circle: { select: { name: true } } },
      });
      if (row) {
        circleName = row.circle.name;
        createdAt = row.createdAt;
        kindLabel = "割り勘を記録しました";
        amountColor = "#fb923c";
        try {
          const msg = JSON.parse(row.message);
          if (typeof msg.amount === "number") amount = msg.amount;
        } catch {
          // ignore malformed JSON
        }
      }
    }
  } catch {
    // DB unavailable — render with defaults
  }

  const amountDisplay =
    amount !== null
      ? type === "expense"
        ? `-¥${amount.toLocaleString("ja-JP")}`
        : `+¥${amount.toLocaleString("ja-JP")}`
      : null;

  const dateDisplay = toJST(createdAt);
  const allText = `CircleRun ${circleName} ${kindLabel} ${amountDisplay ?? ""} ${dateDisplay}`;
  const fontData = await fetchNotoSansJP(allText);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "64px 80px",
          fontFamily: '"Noto Sans JP", sans-serif',
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* subtle background circle decoration */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            right: "-120px",
            width: "480px",
            height: "480px",
            borderRadius: "50%",
            background: "rgba(59,130,246,0.06)",
            display: "flex",
          }}
        />

        {/* App name */}
        <div
          style={{
            fontSize: "26px",
            color: "#3b82f6",
            fontWeight: 700,
            letterSpacing: "0.1em",
            marginBottom: "20px",
            display: "flex",
          }}
        >
          CircleRun
        </div>

        {/* Circle name */}
        <div
          style={{
            fontSize: "38px",
            color: "#e2e8f0",
            fontWeight: 700,
            marginBottom: "40px",
            display: "flex",
          }}
        >
          {circleName}
        </div>

        {/* Amount */}
        {amountDisplay !== null && (
          <div
            style={{
              fontSize: "96px",
              fontWeight: 700,
              color: amountColor,
              lineHeight: 1,
              marginBottom: "32px",
              letterSpacing: "-0.02em",
              display: "flex",
            }}
          >
            {amountDisplay}
          </div>
        )}

        {/* Kind label */}
        <div
          style={{
            fontSize: "30px",
            color: "#94a3b8",
            marginBottom: "28px",
            display: "flex",
          }}
        >
          {kindLabel}
        </div>

        {/* Date */}
        <div
          style={{
            fontSize: "22px",
            color: "#475569",
            display: "flex",
          }}
        >
          {dateDisplay}
        </div>

        {/* Bottom gradient bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "5px",
            background: "linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)",
            display: "flex",
          }}
        />
      </div>
    ),
    {
      ...size,
      fonts: fontData
        ? [{ name: "Noto Sans JP", data: fontData, weight: 700 as const }]
        : [],
    }
  );
}
