"use client";

import { useRef, useEffect } from "react";

export default function CapacitorLoginButton({ agreed }: { agreed: boolean }) {
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
        window.location.replace("https://crun.click/dashboard");
        return true;
      }
    } catch {}
    return false;
  };

  const handleLogin = () => {
    const pollId = crypto.randomUUID();

    // Swift OAuth完了時に即時チェックするコールバックを登録
    (window as any).__authSessionCompleted = async () => {
      const found = await checkPoll(pollId);
      // 念のため見つからなかった場合は通常pollに任せる
      if (!found) {
        pollRef.current = setInterval(() => checkPoll(pollId), 2000);
      }
    };

    // 通常poll（ASWebAuthenticationSessionがキャンセルされた場合などのフォールバック）
    pollRef.current = setInterval(() => checkPoll(pollId), 2000);

    (window as any).webkit?.messageHandlers?.startAuth?.postMessage({ pollId });
  };

  // アンマウント時にクリーンアップ
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      delete (window as any).__authSessionCompleted;
    };
  }, []);

  if (typeof window !== "undefined" && !(window as any).Capacitor) {
    return null;
  }

  return (
    <button
      type="button"
      disabled={!agreed}
      onClick={handleLogin}
      className={`w-full flex items-center justify-center gap-2 rounded-xl font-medium py-3 px-4 text-sm transition shadow-md ${
        agreed
          ? "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
          : "bg-slate-300 text-slate-500 cursor-not-allowed"
      }`}
    >
      <svg aria-hidden className="w-5 h-5" viewBox="0 0 24 24">
        <path fill={agreed ? "#EA4335" : "#9ca3af"} d="M12 10.2v3.7h5.2c-.2 1.2-.9 2.2-2 2.9l3.2 2.5c1.9-1.7 3-4.1 3-6.9 0-.7-.1-1.3-.2-1.9H12z" />
        <path fill={agreed ? "#34A853" : "#9ca3af"} d="M6.5 14.3l-.8.6-2.6 2C4.6 19.6 8.1 21.5 12 21.5c2.7 0 4.9-.9 6.5-2.4l-3.2-2.5c-.9.6-2 1-3.3 1-2.6 0-4.8-1.8-5.6-4.3z" />
        <path fill={agreed ? "#4A90E2" : "#9ca3af"} d="M3.1 7.1C2.4 8.4 2 9.9 2 11.5c0 1.6.4 3.1 1.1 4.4l3.4-2.6c-.2-.6-.4-1.2-.4-1.8 0-.6.1-1.2.4-1.8z" />
        <path fill={agreed ? "#FBBC05" : "#9ca3af"} d="M12 4.5c1.5 0 2.8.5 3.9 1.4l2.9-2.9C17 1.8 14.7.9 12 .9 8.1.9 4.6 2.8 3.1 7.1l3.4 2.6C7.2 6.3 9.4 4.5 12 4.5z" />
      </svg>
      <span>Googleでログイン</span>
    </button>
  );
}
