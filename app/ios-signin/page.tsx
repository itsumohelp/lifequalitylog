"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function IOSSignInInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function startSignIn() {
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      if (session?.user) {
        // すでにログイン済みの場合はトークンを保存してブラウザを閉じる
        document.cookie = `ios-poll-id=${pollId}; path=/; max-age=300; samesite=lax; secure`;
        window.location.replace("/ios-complete");
        return;
      }

      const pollId = searchParams.get("pollId") || "";
      const res = await fetch("/api/auth/csrf");
      const { csrfToken } = await res.json();

      // Store pollId in cookie so /ios-complete can read it server-side
      document.cookie = `ios-poll-id=${pollId}; path=/; max-age=300; samesite=lax; secure`;

      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/api/auth/signin/google";

      const csrfInput = document.createElement("input");
      csrfInput.type = "hidden";
      csrfInput.name = "csrfToken";
      csrfInput.value = csrfToken;
      form.appendChild(csrfInput);

      const callbackInput = document.createElement("input");
      callbackInput.type = "hidden";
      callbackInput.name = "callbackUrl";
      callbackInput.value = "/ios-complete";
      form.appendChild(callbackInput);

      document.body.appendChild(form);
      form.submit();
    }
    startSignIn();
  }, [router, searchParams]);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-500 text-sm">Googleにリダイレクト中...</p>
    </main>
  );
}

export default function IOSSignInPage() {
  return (
    <Suspense>
      <IOSSignInInner />
    </Suspense>
  );
}
