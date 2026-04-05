"use client";

import { useEffect } from "react";

// After Google OAuth, NextAuth redirects here.
// Redirecting to the custom URL scheme closes SFSafariViewController automatically,
// which triggers browserFinished in CapacitorLoginButton → app navigates to /dashboard.
export default function iOSAuthCompletePage() {
  useEffect(() => {
    window.location.href = "click.crun.circlerun://auth-complete";
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-500 text-sm">ログイン完了。アプリに戻っています...</p>
    </main>
  );
}
