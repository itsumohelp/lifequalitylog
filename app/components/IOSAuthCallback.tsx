"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

// Detects when /dashboard is loaded inside SFSafariViewController after iOS OAuth.
// Redirects to URL scheme to signal the Capacitor app to close the browser.
export default function IOSAuthCallback() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // CapacitorLoginButtonがフラグを立てた場合: dashboard完全ロード後にブラウザを閉じる
    if (sessionStorage.getItem("pendingBrowserClose") === "true") {
      sessionStorage.removeItem("pendingBrowserClose");
      import("@capacitor/browser").then(({ Browser }) => Browser.close());
      return;
    }
    if (searchParams.get("iosCallback") === "1") {
      window.location.href = "click.crun.circlerun://auth-complete";
    }
  }, [searchParams]);

  return null;
}
