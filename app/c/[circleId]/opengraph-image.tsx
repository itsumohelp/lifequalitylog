import { ImageResponse } from "next/og";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const alt = "CircleRun - サークル支出管理";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function formatYen(amount: number) {
  return new Intl.NumberFormat("ja-JP").format(amount);
}

type Props = {
  params: Promise<{ circleId: string }>;
};

export default async function Image({ params }: Props) {
  const { circleId } = await params;

  // サークル情報を取得
  const circle = await prisma.circle.findUnique({
    where: { id: circleId },
    select: {
      id: true,
      name: true,
      currentBalance: true,
      isPublic: true,
    },
  });

  // 非公開または存在しない場合はデフォルト画像
  if (!circle || !circle.isPublic) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0f172a",
            color: "#fff",
            fontSize: 48,
          }}
        >
          CircleRun
        </div>
      ),
      { ...size }
    );
  }

  // 最新の取引を取得（支出・収入・スナップショット）
  const [latestExpense, latestIncome, latestSnapshot] = await Promise.all([
    prisma.expense.findFirst({
      where: { circleId },
      orderBy: { createdAt: "desc" },
      select: { amount: true, description: true, createdAt: true },
    }),
    prisma.income.findFirst({
      where: { circleId },
      orderBy: { createdAt: "desc" },
      select: { amount: true, description: true, createdAt: true },
    }),
    prisma.circleSnapshot.findFirst({
      where: { circleId },
      orderBy: { createdAt: "desc" },
      select: { amount: true, note: true, createdAt: true },
    }),
  ]);

  // 最新の取引を特定
  type LatestItem = { type: "expense" | "income" | "snapshot"; amount: number; description: string; createdAt: Date };
  const items: LatestItem[] = [];

  if (latestExpense) {
    items.push({
      type: "expense",
      amount: latestExpense.amount,
      description: latestExpense.description,
      createdAt: latestExpense.createdAt,
    });
  }
  if (latestIncome) {
    items.push({
      type: "income",
      amount: latestIncome.amount,
      description: latestIncome.description,
      createdAt: latestIncome.createdAt,
    });
  }
  if (latestSnapshot) {
    items.push({
      type: "snapshot",
      amount: latestSnapshot.amount,
      description: latestSnapshot.note || "残高更新",
      createdAt: latestSnapshot.createdAt,
    });
  }

  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const latest = items[0];

  // 最新取引の表示テキスト
  let latestText = "";
  if (latest) {
    if (latest.type === "expense") {
      latestText = `支出: -¥${formatYen(latest.amount)} ${latest.description}`;
    } else if (latest.type === "income") {
      latestText = `収入: +¥${formatYen(latest.amount)} ${latest.description}`;
    } else {
      latestText = `残高更新: ¥${formatYen(latest.amount)}`;
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0f172a",
          padding: "48px 64px",
          position: "relative",
        }}
      >
        {/* メインコンテンツ */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {/* サークル名 */}
          <div
            style={{
              fontSize: 36,
              color: "#94a3b8",
              marginBottom: 8,
            }}
          >
            {circle.name}の支出管理
          </div>

          {/* 残高 */}
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              color: "#fff",
              marginBottom: 24,
            }}
          >
            ¥{formatYen(circle.currentBalance)}
          </div>

          {/* 最新の取引 */}
          {latestText && (
            <div
              style={{
                fontSize: 32,
                color: latest?.type === "expense" ? "#f87171" : latest?.type === "income" ? "#4ade80" : "#94a3b8",
                backgroundColor: "#1e293b",
                padding: "16px 24px",
                borderRadius: 12,
                display: "flex",
              }}
            >
              {latestText}
            </div>
          )}
        </div>

        {/* フッター: ロゴとサービス名 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 12,
          }}
        >
          {/* ロゴ (SVGをシンプルな図形で表現) */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              border: "3px solid #0ea5e9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 700,
              color: "#0f172a",
              backgroundColor: "#0ea5e9",
            }}
          >
            CR
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 600,
              color: "#fff",
            }}
          >
            CircleRun
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
