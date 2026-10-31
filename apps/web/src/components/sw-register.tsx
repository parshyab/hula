'use client';

import { useEffect } from 'react';

/** Registers the PWA service worker so the app is installable with an offline shell. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* offline support is best-effort */
      });
    }
  }, []);
  return null;
}
