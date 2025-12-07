// app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import Header from "@/app/componets/Header";
import { GoogleAnalytics } from "@next/third-parties/google";
export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="ja">
      <body className="bg-slate-950 text-slate-50">
        {/* 画面全体：縦にヘッダー＋コンテンツ */}
        <div className="min-h-screen flex flex-col bg-slate-950">
          {/* 共通ヘッダー（高さぶんだけ上に積まれる） */}
          <Header session={session} />

          {/* 残り全部がここに入る */}
          <main className="flex-1 bg-slate-950">{children}</main>
        </div>
      </body>
      <GoogleAnalytics gaId="G-64XWZ672CX" />
    </html>
  );
}
