"use client";

import { useRef, useEffect } from "react";

export default function CapacitorLoginButton({ agreed, callbackUrl }: { agreed: boolean; callbackUrl?: string }) {
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkPoll = async (pollId: string) => {
    try {
      const res = await fetch(`https://crun.click/api/auth/ios-poll?pollId=${pollId}`);
      const data = await res.json();
      if (data.token) {
        clearInterval(pollRef.current!);
        await fetch(`https://crun.click/api/auth/ios-session?token=${encodeURIComponent(data.token)}`, {
          credentials: "include",
        });
        const redirectTo = callbackUrl ? decodeURIComponent(callbackUrl) : "/dashboard";
        window.location.replace("https://crun.click" + redirectTo);
        return true;
      }
    } catch {}
    return false;
  };

  const handleAppleLogin = () => {
    (window as any).__appleAuthCompleted = async ({ identityToken, firstName, lastName }: { identityToken: string; firstName: string; lastName: string }) => {
      delete (window as any).__appleAuthCompleted;
      try {
        const res = await fetch("https://crun.click/api/auth/apple-ios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ identityToken, firstName, lastName }),
        });
        const { token } = await res.json();
        if (token) {
          await fetch(`https://crun.click/api/auth/ios-session?token=${encodeURIComponent(token)}`, {
            credentials: "include",
          });
          const redirectTo = callbackUrl ? decodeURIComponent(callbackUrl) : "/dashboard";
          window.location.replace("https://crun.click" + redirectTo);
        }
      } catch {}
    };
    (window as any).webkit?.messageHandlers?.startAppleAuth?.postMessage({});
  };

  const handleLogin = () => {
    const pollId = crypto.randomUUID();

    // Swift OAuth完了時に即時チェック
    (window as any).__authSessionCompleted = async () => {
      const found = await checkPoll(pollId);
      if (!found) {
        pollRef.current = setInterval(() => checkPoll(pollId), 2000);
      }
    };

    const handler = (window as any).webkit?.messageHandlers?.startAuth;
    if (!handler) {
      return;
    }

    // フォールバック用poll
    pollRef.current = setInterval(() => checkPoll(pollId), 2000);
    handler.postMessage({ pollId });
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      delete (window as any).__authSessionCompleted;
    };
  }, []);

  if (typeof window !== "undefined" && !(window as any).Capacitor) {
    return null;
  }

  const btnClass = (agreed: boolean) =>
    `w-full flex items-center justify-center gap-2 rounded-xl font-medium py-3 px-4 text-sm transition shadow-md ${
      agreed
        ? "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
        : "bg-slate-300 text-slate-500 cursor-not-allowed"
    }`;

  return (
    <div className="flex flex-col gap-3">
      <button type="button" disabled={!agreed} onClick={handleLogin} className={btnClass(agreed)}>
        <svg aria-hidden className="w-5 h-5" viewBox="0 0 24 24">
          <path fill={agreed ? "#EA4335" : "#9ca3af"} d="M12 10.2v3.7h5.2c-.2 1.2-.9 2.2-2 2.9l3.2 2.5c1.9-1.7 3-4.1 3-6.9 0-.7-.1-1.3-.2-1.9H12z" />
          <path fill={agreed ? "#34A853" : "#9ca3af"} d="M6.5 14.3l-.8.6-2.6 2C4.6 19.6 8.1 21.5 12 21.5c2.7 0 4.9-.9 6.5-2.4l-3.2-2.5c-.9.6-2 1-3.3 1-2.6 0-4.8-1.8-5.6-4.3z" />
          <path fill={agreed ? "#4A90E2" : "#9ca3af"} d="M3.1 7.1C2.4 8.4 2 9.9 2 11.5c0 1.6.4 3.1 1.1 4.4l3.4-2.6c-.2-.6-.4-1.2-.4-1.8 0-.6.1-1.2.4-1.8z" />
          <path fill={agreed ? "#FBBC05" : "#9ca3af"} d="M12 4.5c1.5 0 2.8.5 3.9 1.4l2.9-2.9C17 1.8 14.7.9 12 .9 8.1.9 4.6 2.8 3.1 7.1l3.4 2.6C7.2 6.3 9.4 4.5 12 4.5z" />
        </svg>
        <span>Googleでログイン</span>
      </button>

      <button type="button" disabled={!agreed} onClick={handleAppleLogin} className={btnClass(agreed)}>
        <svg aria-hidden className="w-5 h-5" viewBox="0 0 24 24" fill={agreed ? "white" : "#9ca3af"}>
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
        <span>Appleでログイン</span>
      </button>
    </div>
  );
}
