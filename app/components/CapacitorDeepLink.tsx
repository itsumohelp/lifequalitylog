"use client";

import { useEffect } from "react";

export default function CapacitorDeepLink() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!(window as any).Capacitor) return;

    let cleanup: (() => void) | null = null;

    import("@capacitor/app").then(({ App }) => {
      const listener = App.addListener(
        "appUrlOpen",
        (event: { url: string }) => {
          try {
            const url = new URL(event.url);
            const dest = url.pathname + url.search;
            if (dest && dest !== "/") {
              window.location.href = dest;
            }
          } catch {
            // URLパースエラーは無視
          }
        },
      );

      cleanup = () => {
        listener.then((h: { remove: () => void }) => h.remove());
      };
    });

    return () => {
      cleanup?.();
    };
  }, []);

  return null;
}
