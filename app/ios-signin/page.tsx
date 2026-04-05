"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Opened in SFSafariViewController from iOS app.
// Fetches CSRF token client-side (within SFSafariVC cookie context),
// then POSTs to NextAuth sign-in endpoint to initiate Google OAuth.
export default function iOSSignInPage() {
  const router = useRouter();

  useEffect(() => {
    async function startSignIn() {
      // If already signed in, redirect to dashboard
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      if (session?.user) {
        router.replace("/dashboard");
        return;
      }

      // Fetch CSRF token — sets next-auth.csrf-token cookie in SFSafariVC's context
      const res = await fetch("/api/auth/csrf");
      const { csrfToken } = await res.json();

      // Build and submit form POST to NextAuth
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
      callbackInput.value = "/api/auth/ios-callback";
      form.appendChild(callbackInput);

      document.body.appendChild(form);
      form.submit();
    }
    startSignIn();
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-500 text-sm">Googleにリダイレクト中...</p>
    </main>
  );
}

