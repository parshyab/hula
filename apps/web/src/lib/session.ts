'use client';

/** Per-viewer session token store. Wrapped in try/catch — localStorage can
 *  throw in private windows. The token is a short-lived API session JWT. */
const KEY = 'saathi.session';

export function getToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
