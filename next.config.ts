import type { NextConfig } from "next";

// ビルド時刻から6文字のバージョンIDを生成
// 2020年1月1日からの経過分を36進数で表現（重複なし、時系列順）
function generateBuildId(): string {
  const baseTime = new Date("2020-01-01T00:00:00Z").getTime();
  const now = Date.now();
  const minutesSinceBase = Math.floor((now - baseTime) / 60000);
  // 36進数に変換し、6文字に右詰め（先頭は0埋め）
  const base36 = minutesSinceBase.toString(36).toUpperCase();
  return base36.padStart(6, "0").slice(-6);
}

const buildId = generateBuildId();

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [new URL('https://lh3.googleusercontent.com/**')],
  },
  env: {
    NEXT_PUBLIC_BUILD_ID: buildId,
  },
};

export default nextConfig;
