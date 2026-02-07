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
            backgroundColor: "#e2e8f0",
            color: "#0f172a",
            fontSize: 48,
          }}
        >
          CircleRun
        </div>
      ),
      { ...size }
    );
  }

  // 最新の取引を取得（支出・収入）
  const [latestExpense, latestIncome] = await Promise.all([
    prisma.expense.findFirst({
      where: { circleId },
      orderBy: { createdAt: "desc" },
      select: { amount: true, description: true, tags: true, createdAt: true },
    }),
    prisma.income.findFirst({
      where: { circleId },
      orderBy: { createdAt: "desc" },
      select: { amount: true, description: true, tags: true, createdAt: true },
    }),
  ]);

  // 最新の取引を特定
  type LatestItem = {
    type: "expense" | "income";
    amount: number;
    description: string;
    tags: string[];
    createdAt: Date;
  };
  const items: LatestItem[] = [];

  if (latestExpense) {
    items.push({
      type: "expense",
      amount: latestExpense.amount,
      description: latestExpense.description,
      tags: latestExpense.tags || [],
      createdAt: latestExpense.createdAt,
    });
  }
  if (latestIncome) {
    items.push({
      type: "income",
      amount: latestIncome.amount,
      description: latestIncome.description,
      tags: latestIncome.tags || [],
      createdAt: latestIncome.createdAt,
    });
  }

  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const latest = items[0];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#e2e8f0",
          padding: "48px 64px",
        }}
      >
        {/* サークル名 + の支出管理（左寄せ） */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            marginBottom: 24,
          }}
        >
          <span
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            {circle.name}
          </span>
          <span
            style={{
              fontSize: 32,
              color: "#64748b",
              marginLeft: 8,
            }}
          >
            の支出管理
          </span>
        </div>

        {/* メインコンテンツ（中央寄せ） */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "center", justifyContent: "center" }}>
          {/* 残高 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 32,
            }}
          >
            <span
              style={{
                fontSize: 48,
                color: "#64748b",
              }}
            >
              合計
            </span>
            <span
              style={{
                fontSize: 160,
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              ¥{formatYen(circle.currentBalance)}
            </span>
          </div>

          {/* 最新の取引 */}
          {latest && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "#fff",
                padding: "20px 28px",
                borderRadius: 16,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                gap: 16,
              }}
            >
              <span
                style={{
                  fontSize: 24,
                  color: "#64748b",
                }}
              >
                最新の収入支出
              </span>
              {/* 金額 */}
              <span
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  color: latest.type === "expense" ? "#dc2626" : "#16a34a",
                }}
              >
                {latest.type === "expense" ? "-" : "+"}¥{formatYen(latest.amount)}
              </span>
              {/* タグ */}
              {latest.tags.length > 0 && (
                <div style={{ display: "flex", gap: 8 }}>
                  {latest.tags.slice(0, 3).map((tag, i) => (
                    <span
                      key={i}
                      style={{
                        display: "flex",
                        fontSize: 24,
                        backgroundColor: "#0ea5e9",
                        color: "#ffffff",
                        padding: "6px 18px",
                        borderRadius: 9999,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
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
          {/* ロゴ（Cの形の円とRの文字） */}
          <svg
            width="48"
            height="48"
            viewBox="0 0 32 32"
            fill="none"
          >
            {/* 外側の円（C） */}
            <circle
              cx="16"
              cy="16"
              r="12"
              stroke="#0ea5e9"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="56 20"
              transform="rotate(-45 16 16)"
            />
            {/* 内側のR */}
            <path
              d="M13 10h4a3 3 0 0 1 0 6h-4v6M17 16l4 6"
              stroke="#0f172a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              fontWeight: 600,
              color: "#0f172a",
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
