"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

// Detects when /dashboard is loaded inside SFSafariViewController after iOS OAuth.
// Redirects to URL scheme to signal the Capacitor app to close the browser.
export default function IOSAuthCallback() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("iosCallback") === "1") {
      // Redirect to URL scheme — SFSafariVC cannot handle it, so iOS closes it
      // and opens the app, triggering browserFinished in CapacitorLoginButton.
      window.location.href = "click.crun.circlerun://auth-complete";
    }
  }, [searchParams]);

  return null;
}
