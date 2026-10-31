import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * PIN hashing for the mobile / WhatsApp / SMS flow. scrypt with a per-PIN salt.
 * Format: `scrypt$<saltHex>$<hashHex>`. Deliberately dependency-free so it can
 * be reused by the seed script without pulling in the rest of auth.
 */
const KEYLEN = 32;

export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, KEYLEN);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = Buffer.from(parts[1]!, 'hex');
  const expected = Buffer.from(parts[2]!, 'hex');
  const actual = scryptSync(pin, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Lockout policy for PIN entry (defence against brute force). */
export const PIN_MAX_ATTEMPTS = 5;
export const PIN_LOCK_MINUTES = 15;
