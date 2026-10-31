import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Role } from '@saathi/config';
import { ROLES } from '@saathi/config';

export interface OidcConfig {
  keycloakUrl: string;
  realm: string;
  clientId: string;
}

export interface VerifiedIdentity {
  sub: string;
  preferredUsername?: string;
  email?: string;
  name?: string;
  /** Realm roles, intersected with roles Saathi knows about. */
  roles: Role[];
  /** ABAC attributes, present only if mapped into the token by the realm. */
  empCode?: string;
  unit?: string;
  dept?: string;
}

/**
 * Builds a verifier for Keycloak-issued JWTs. Verifies signature (via the
 * realm JWKS), issuer and expiry. Roles come from `realm_access.roles`; the
 * employee link and ABAC attributes are resolved from the DB on login, not
 * trusted from the token.
 */
export function createOidcVerifier(cfg: OidcConfig) {
  const issuer = `${cfg.keycloakUrl.replace(/\/$/, '')}/realms/${cfg.realm}`;
  const jwks = createRemoteJWKSet(new URL(`${issuer}/protocol/openid-connect/certs`));

  return async function verify(token: string): Promise<VerifiedIdentity> {
    const { payload } = await jwtVerify(token, jwks, { issuer });
    const realmAccess = (payload as Record<string, unknown>)['realm_access'] as
      | { roles?: string[] }
      | undefined;
    const roles = (realmAccess?.roles ?? []).filter((r): r is Role =>
      (ROLES as readonly string[]).includes(r),
    );
    return {
      sub: String(payload.sub),
      preferredUsername: payload['preferred_username'] as string | undefined,
      email: payload['email'] as string | undefined,
      name: payload['name'] as string | undefined,
      roles,
      empCode: payload['empCode'] as string | undefined,
      unit: payload['unit'] as string | undefined,
      dept: payload['dept'] as string | undefined,
    };
  };
}

export { issuerUrl };
function issuerUrl(cfg: OidcConfig): string {
  return `${cfg.keycloakUrl.replace(/\/$/, '')}/realms/${cfg.realm}`;
}
