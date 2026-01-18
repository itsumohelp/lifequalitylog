// app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import type { Viewport } from "next";
import { auth } from "@/auth";
import Header from "@/app/componets/Header";
import { GoogleAnalytics } from "@next/third-parties/google";

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
        <div className="min-h-screen flex flex-col bg-slate-50">
          <Header session={session} />
          <main className="flex-1 bg-slate-50">{children}</main>
        </div>
      </body>
      <GoogleAnalytics gaId="G-64XWZ672CX" />
    </html>
  );
}
