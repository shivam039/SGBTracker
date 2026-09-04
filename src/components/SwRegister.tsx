"use client";

import { useEffect } from "react";

/** Registers the PWA service worker — required for Android/TWA app store installability. */
export function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installability is degraded without it, but the app itself still works fine.
      });
    }
  }, []);

  return null;
}
