"use client";

import { useEffect } from "react";

// LINE・Facebook・Instagram等のWebView内ではSafariで強制的に開く
// x-safari-https://... はiOSがSafariハンドラーとして処理するURLスキーム
const IN_APP_BROWSER_PATTERNS = [
  /Line\//i, // LINE
  /FBAV|FBAN|FB_IAB/i, // Facebook
  /Instagram/i, // Instagram
  /MicroMessenger/i, // WeChat
];

function isInAppBrowser(ua: string): boolean {
  // Capacitorネイティブアプリは除外
  if (
    typeof window !== "undefined" &&
    (window as { Capacitor?: unknown }).Capacitor
  ) {
    return false;
  }
  return IN_APP_BROWSER_PATTERNS.some((pattern) => pattern.test(ua));
}

export default function WebViewGuard() {
  useEffect(() => {
    if (!isInAppBrowser(navigator.userAgent)) return;

    // x-safari- スキームでSafariを強制起動（iOS）
    const safariUrl = "x-safari-" + window.location.href;
    window.location.href = safariUrl;
  }, []);

  return null;
}
