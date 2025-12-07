// app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import Header from "@/app/componets/Header";

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="ja">
      <body className="bg-slate-950 text-slate-50">
        <div className="min-h-screen flex flex-col">
          {/* 共通ヘッダー */}
          <Header session={session} />

          {/* ページごとの中身 */}
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
