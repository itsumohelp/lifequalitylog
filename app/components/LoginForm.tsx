"use client";

import { useState } from "react";
import Link from "next/link";

type Props = {
  action: () => Promise<void>;
};

export default function LoginForm({ action }: Props) {
  const [agreed, setAgreed] = useState(false);

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
          </Link>
          {" "}と{" "}
          <Link
            href="/privacy"
            target="_blank"
            className="text-sky-600 hover:text-sky-700 underline"
            onClick={(e) => e.stopPropagation()}
          >
            プライバシーポリシー
          </Link>
          {" "}に同意する
        </span>
      </label>

      {/* ログインボタン */}
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

      <p className="mt-4 text-[11px] text-slate-400 text-center">
        ※ 現在は Google アカウントのみ対応
      </p>
    </div>
  );
}
