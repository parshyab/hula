import { SignJWT, jwtVerify } from 'jose';
import type { Role } from '@saathi/config';
import { env } from './env';

const secret = new TextEncoder().encode(env.SESSION_SECRET);
const ISSUER = 'saathi-api';

export interface SessionClaims {
  userId: string;
  empCode?: string | null;
  roles: Role[];
  unit?: string | null;
  dept?: string | null;
}

/** Mint a short-lived session token after OTP+PIN or OIDC login. */
export async function signSession(claims: SessionClaims, ttlSeconds = 60 * 60 * 8): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secret);
}

export async function verifySession(token: string): Promise<SessionClaims> {
  const { payload } = await jwtVerify(token, secret, { issuer: ISSUER });
  return {
    userId: String(payload.userId),
    empCode: (payload.empCode as string | undefined) ?? null,
    roles: (payload.roles as Role[] | undefined) ?? [],
    unit: (payload.unit as string | undefined) ?? null,
    dept: (payload.dept as string | undefined) ?? null,
  };
}
