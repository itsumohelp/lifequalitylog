"use client";

import { useState, useEffect } from "react";

// WebView検出関数
function isInAppBrowser(): { isWebView: boolean; appName: string | null } {
  if (typeof window === "undefined") {
    return { isWebView: false, appName: null };
  }

  const ua = navigator.userAgent || navigator.vendor || "";

  // LINE
  if (/Line\//i.test(ua)) {
    return { isWebView: true, appName: "LINE" };
  }

  // Facebook
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) {
    return { isWebView: true, appName: "Facebook" };
  }

  // Instagram
  if (/Instagram/i.test(ua)) {
    return { isWebView: true, appName: "Instagram" };
  }

  // Twitter
  if (/Twitter/i.test(ua)) {
    return { isWebView: true, appName: "Twitter" };
  }

  // Gmail (iOS)
  if (/GSA\//i.test(ua)) {
    return { isWebView: true, appName: "Gmail" };
  }

  // Generic WebView detection
  // iOS WebView
  if (/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(ua)) {
    return { isWebView: true, appName: null };
  }

  // Android WebView
  if (/wv\)/.test(ua) || /Android.*Version\/[\d.]+.*Chrome\/[\d.]+ Mobile/i.test(ua)) {
    // But exclude actual Chrome browser
    if (!/Chrome\/[\d.]+ Mobile Safari/i.test(ua)) {
      return { isWebView: true, appName: null };
    }
  }

  return { isWebView: false, appName: null };
}

export default function WebViewAlert() {
  const [showAlert, setShowAlert] = useState(false);
  const [appName, setAppName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const { isWebView, appName: detected } = isInAppBrowser();
    if (isWebView) {
      setShowAlert(true);
      setAppName(detected);
    }
  }, []);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInBrowser = () => {
    // iOS Safari用: URLスキームでSafariを開く試み
    const url = window.location.href;

    // iOSの場合、x-safari-スキームを試す（一部アプリで動作）
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      // Safari用のURLスキーム
      window.location.href = `x-safari-${url}`;

      // フォールバック: 少し待ってからまだ同じページにいる場合はアラートを表示
      setTimeout(() => {
        // まだページにいる場合（スキームが機能しなかった場合）
        // ユーザーに手動で開くよう案内
      }, 500);
    } else {
      // Androidの場合、intent:// スキームを試す
      const intentUrl = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
      window.location.href = intentUrl;
    }
  };

  if (!showAlert) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl">
        {/* ヘッダー */}
        <div className="text-center mb-4">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            ブラウザで開いてください
          </h2>
        </div>

        {/* 説明 */}
        <div className="text-sm text-slate-600 mb-5 space-y-2">
          <p>
            {appName ? `${appName}のアプリ内ブラウザ` : "アプリ内ブラウザ"}
            ではGoogleログインが利用できません。
          </p>
          <p>
            Safari などのブラウザで開き直してください。
          </p>
        </div>

        {/* 手順 */}
        <div className="bg-slate-50 rounded-xl p-4 mb-5">
          <p className="text-xs font-medium text-slate-700 mb-2">開き方：</p>
          <ol className="text-xs text-slate-600 space-y-1.5">
            <li className="flex gap-2">
              <span className="font-medium text-slate-800">1.</span>
              <span>右上の「︙」または共有ボタンをタップ</span>
            </li>
            <li className="flex gap-2">
              <span className="font-medium text-slate-800">2.</span>
              <span>「Safari で開く」または「ブラウザで開く」を選択</span>
            </li>
          </ol>
        </div>

        {/* ボタン */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleCopyUrl}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-4 text-sm transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>{copied ? "コピーしました！" : "URLをコピー"}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenInBrowser}
            className="w-full rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-4 text-sm transition"
          >
            ブラウザで開く（試行）
          </button>

          <button
            type="button"
            onClick={() => setShowAlert(false)}
            className="w-full text-slate-500 hover:text-slate-700 text-sm py-2 transition"
          >
            このまま続ける
          </button>
        </div>
      </div>
    </div>
  );
}
