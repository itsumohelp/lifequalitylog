"use client";

import { useEffect } from "react";

// Opened in SFSafariViewController from iOS app.
// Fetches CSRF token client-side (within SFSafariVC cookie context),
// then POSTs to NextAuth sign-in endpoint to initiate Google OAuth.
export default function iOSSignInPage() {
  useEffect(() => {
    async function startSignIn() {
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
      callbackInput.value = "/ios-auth-complete";
      form.appendChild(callbackInput);

      document.body.appendChild(form);
      form.submit();
    }
    startSignIn();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-500 text-sm">Googleにリダイレクト中...</p>
    </main>
  );
}

