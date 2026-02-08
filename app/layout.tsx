// app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import type { Viewport, Metadata } from "next";
import { auth } from "@/auth";
import Header from "@/app/componets/Header";
import { GoogleAnalytics } from "@next/third-parties/google";

// OGP画像の絶対URL生成に必要
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://crun.click";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "CircleRun - サークル支出管理",
  description: "支出や収入をチャット感覚でサクッと記録。家族・友人・サークルでお金の動きを共有。",
  openGraph: {
    siteName: "CircleRun",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="ja">
      <body className="text-slate-50 bg-slate-50">
        <div className="h-dvh flex flex-col bg-slate-50 overflow-hidden">
          <Header session={session} />
          <main className="flex-1 bg-slate-50 overflow-auto flex flex-col min-h-0">{children}</main>
        </div>
      </body>
      <GoogleAnalytics gaId="G-64XWZ672CX" />
    </html>
  );
}
