import { createHash, randomInt } from 'node:crypto';

/**
 * OTP generation + hashing for mobile login and sensitive confirmations.
 * Codes are never stored in plaintext — only their SHA-256 hash is persisted.
 */
export const OTP_TTL_MINUTES = 5;
export const OTP_MAX_ATTEMPTS = 5;

export function generateOtp(digits = 6): string {
  const max = 10 ** digits;
  return randomInt(0, max).toString().padStart(digits, '0');
}

export function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export function otpExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + OTP_TTL_MINUTES * 60_000);
}
