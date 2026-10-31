'use client';

import { useEffect } from 'react';
import { setToken } from '@/lib/session';
import { useRouter } from '@/i18n/routing';

/** Keycloak OIDC lands here with #token=… from the API callback. */
export default function OidcCallback() {
  const router = useRouter();
  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const match = hash.match(/token=([^&]+)/);
    if (match?.[1]) {
      setToken(decodeURIComponent(match[1]));
      router.replace('/me');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return <p className="text-sm text-text-muted">Signing you in…</p>;
}
