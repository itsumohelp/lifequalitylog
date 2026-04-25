"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import CapacitorLoginButton from "@/app/components/CapacitorLoginButton";

type Props = {
  action: () => Promise<void>;
  callbackUrl?: string;
};

export default function LoginForm({ action, callbackUrl }: Props) {
  const [agreed, setAgreed] = useState(false);
  const [isCapacitor, setIsCapacitor] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const cap = typeof window !== "undefined" && !!(window as any).Capacitor;
    setIsCapacitor(cap);
    if (!cap) {
      setIsIOS(/iPhone|iPad|iPod/.test(navigator.userAgent));
    }
  }, []);

  const handleOpenNativeApp = () => {
    let path = "";
    if (callbackUrl) {
      try {
        const decoded = decodeURIComponent(callbackUrl);
        path = decoded.startsWith("/") ? decoded.slice(1) : decoded;
      } catch {
        path = callbackUrl.startsWith("/") ? callbackUrl.slice(1) : callbackUrl;
      }
    }
    window.location.href = path
      ? `click.crun.circlerun://${path}`
      : "click.crun.circlerun://";
  };

  return (
    <div>
      {/* 同意チェックボックス */}
      <label className="flex items-start gap-2 mb-4 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
        />
        <span className="text-xs text-slate-600 leading-relaxed">
          <Link
            href="/terms"
            target="_blank"
            className="text-sky-600 hover:text-sky-700 underline"
            onClick={(e) => e.stopPropagation()}
          >
            利用規約
          </Link>{" "}
          と{" "}
          <Link
            href="/privacy"
            target="_blank"
            className="text-sky-600 hover:text-sky-700 underline"
            onClick={(e) => e.stopPropagation()}
          >
            プライバシーポリシー
          </Link>{" "}
          に同意する
        </span>
      </label>

      {/* ログインボタン */}
      {isCapacitor ? (
        <CapacitorLoginButton agreed={agreed} callbackUrl={callbackUrl} />
      ) : (
        <div className="space-y-3">
          <form action={action}>
            <button
              type="submit"
              disabled={!agreed}
              className={`w-full flex items-center justify-center gap-2 rounded-xl font-medium py-3 px-4 text-sm transition shadow-md ${
                agreed
                  ? "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
                  : "bg-slate-300 text-slate-500 cursor-not-allowed"
              }`}
            >
              <svg aria-hidden className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill={agreed ? "#EA4335" : "#9ca3af"}
                  d="M12 10.2v3.7h5.2c-.2 1.2-.9 2.2-2 2.9l3.2 2.5c1.9-1.7 3-4.1 3-6.9 0-.7-.1-1.3-.2-1.9H12z"
                />
                <path
                  fill={agreed ? "#34A853" : "#9ca3af"}
                  d="M6.5 14.3l-.8.6-2.6 2C4.6 19.6 8.1 21.5 12 21.5c2.7 0 4.9-.9 6.5-2.4l-3.2-2.5c-.9.6-2 1-3.3 1-2.6 0-4.8-1.8-5.6-4.3z"
                />
                <path
                  fill={agreed ? "#4A90E2" : "#9ca3af"}
                  d="M3.1 7.1C2.4 8.4 2 9.9 2 11.5c0 1.6.4 3.1 1.1 4.4l3.4-2.6c-.2-.6-.4-1.2-.4-1.8 0-.6.1-1.2.4-1.8z"
                />
                <path
                  fill={agreed ? "#FBBC05" : "#9ca3af"}
                  d="M12 4.5c1.5 0 2.8.5 3.9 1.4l2.9-2.9C17 1.8 14.7.9 12 .9 8.1.9 4.6 2.8 3.1 7.1l3.4 2.6C7.2 6.3 9.4 4.5 12 4.5z"
                />
              </svg>
              <span>Googleでログイン</span>
            </button>
          </form>

          {/* iOS向け：アプリ（Apple ID）で開くボタン */}
          {isIOS && (
            <button
              type="button"
              onClick={handleOpenNativeApp}
              disabled={!agreed}
              className={`w-full flex items-center justify-center gap-2 rounded-xl font-medium py-3 px-4 text-sm transition shadow-md ${
                agreed
                  ? "bg-black hover:bg-slate-800 text-white cursor-pointer"
                  : "bg-slate-300 text-slate-500 cursor-not-allowed"
              }`}
            >
              <svg aria-hidden className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <span>Apple IDでログイン（アプリで開く）</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
