import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import type { Subject } from '@saathi/auth';
import { verifySession } from '../session';

export interface Context {
  /** The authenticated subject, or null for anonymous requests. */
  subject: Subject | null;
}

/**
 * Builds the per-request context. Both login methods (OTP+PIN and Keycloak
 * OIDC) converge on a Saathi session token, so the API has one way to identify
 * the caller regardless of how they signed in.
 */
export async function createContext({ req }: CreateFastifyContextOptions): Promise<Context> {
  const header = req.headers['authorization'];
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) return { subject: null };
  try {
    const claims = await verifySession(token);
    return {
      subject: {
        userId: claims.userId,
        empCode: claims.empCode,
        roles: claims.roles,
        unit: claims.unit,
        dept: claims.dept,
      },
    };
  } catch {
    return { subject: null };
  }
}
