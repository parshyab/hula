import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@saathi/db';
import {
  generateOtp,
  hashOtp,
  otpExpiry,
  OTP_MAX_ATTEMPTS,
  verifyPin,
  PIN_MAX_ATTEMPTS,
  PIN_LOCK_MINUTES,
  createOidcVerifier,
} from '@saathi/auth';
import type { Role } from '@saathi/config';
import { signSession } from '../session';
import { record } from '../audit';
import { env } from '../env';

const requestSchema = z.object({ mobile: z.string().min(6) });
const verifySchema = z.object({ mobile: z.string().min(6), code: z.string().min(4), pin: z.string().min(4) });

/**
 * Mobile-first auth: OTP (proves possession of the number) + PIN (something you
 * know). In development the OTP is returned in the response so the WhatsApp /
 * call simulators and tests can proceed without an SMS gateway.
 */
export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/otp/request', async (req, reply) => {
    const { mobile } = requestSchema.parse(req.body);
    const code = generateOtp();
    await prisma.otpChallenge.create({
      data: { mobile, codeHash: hashOtp(code), expiresAt: otpExpiry() },
    });
    // DEV ONLY — never return the code in production.
    const devCode = env.NODE_ENV === 'production' ? undefined : code;
    return reply.send({ ok: true, devCode });
  });

  app.post('/auth/otp/verify', async (req, reply) => {
    const { mobile, code, pin } = verifySchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { mobile }, include: { pin: true } });
    if (!user || !user.pin) {
      return reply.code(401).send({ error: 'Unknown mobile number' });
    }

    // PIN lockout.
    if (user.pin.lockedUntil && user.pin.lockedUntil > new Date()) {
      return reply.code(429).send({ error: 'PIN temporarily locked. Try again later.' });
    }

    const challenge = await prisma.otpChallenge.findFirst({
      where: { mobile, purpose: 'login', consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!challenge) return reply.code(401).send({ error: 'No valid OTP. Request a new one.' });
    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      return reply.code(429).send({ error: 'Too many OTP attempts.' });
    }

    if (challenge.codeHash !== hashOtp(code)) {
      await prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      return reply.code(401).send({ error: 'Incorrect OTP' });
    }

    if (!verifyPin(pin, user.pin.pinHash)) {
      const failed = user.pin.failedAttempts + 1;
      const lock = failed >= PIN_MAX_ATTEMPTS;
      await prisma.pinCredential.update({
        where: { userId: user.id },
        data: {
          failedAttempts: lock ? 0 : failed,
          lockedUntil: lock ? new Date(Date.now() + PIN_LOCK_MINUTES * 60_000) : null,
        },
      });
      return reply.code(401).send({ error: 'Incorrect PIN' });
    }

    // Success — consume the OTP, clear PIN failures, mint a session.
    await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
    await prisma.pinCredential.update({
      where: { userId: user.id },
      data: { failedAttempts: 0, lockedUntil: null },
    });

    const token = await signSession({
      userId: user.id,
      empCode: user.empCode,
      roles: user.roles as Role[],
      unit: user.unit,
      dept: user.dept,
    });
    await record({
      actorType: 'human',
      actorId: user.id,
      action: 'auth.login',
      resourceType: 'session',
      inputs: { method: 'otp+pin', mobile },
    });
    return reply.send({ token, user: { empCode: user.empCode, roles: user.roles } });
  });

  // ── Keycloak OIDC (web console) ───────────────────────────────────────────
  const verifyOidc = createOidcVerifier({
    keycloakUrl: env.KEYCLOAK_URL,
    realm: env.KEYCLOAK_REALM,
    clientId: env.KEYCLOAK_CLIENT_ID,
  });
  const issuer = `${env.KEYCLOAK_URL.replace(/\/$/, '')}/realms/${env.KEYCLOAK_REALM}`;

  app.get('/auth/oidc/login', async (_req, reply) => {
    const params = new URLSearchParams({
      client_id: env.KEYCLOAK_CLIENT_ID,
      redirect_uri: `http://localhost:${env.API_PORT}/auth/oidc/callback`,
      response_type: 'code',
      scope: 'openid profile email',
    });
    return reply.redirect(`${issuer}/protocol/openid-connect/auth?${params}`);
  });

  app.get('/auth/oidc/callback', async (req, reply) => {
    const code = (req.query as Record<string, string>)['code'];
    if (!code) return reply.code(400).send({ error: 'Missing code' });

    const tokenRes = await fetch(`${issuer}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: env.KEYCLOAK_CLIENT_ID,
        client_secret: env.KEYCLOAK_CLIENT_SECRET,
        redirect_uri: `http://localhost:${env.API_PORT}/auth/oidc/callback`,
      }),
    });
    if (!tokenRes.ok) return reply.code(401).send({ error: 'Token exchange failed' });
    const tokens = (await tokenRes.json()) as { access_token: string };
    const identity = await verifyOidc(tokens.access_token);

    // Provision / update the User from the verified identity + token attributes.
    const user = await prisma.user.upsert({
      where: { keycloakSub: identity.sub },
      create: {
        keycloakSub: identity.sub,
        roles: identity.roles,
        empCode: identity.empCode ?? null,
        unit: identity.unit ?? null,
        dept: identity.dept ?? null,
      },
      update: { roles: identity.roles },
      include: { employee: true },
    });

    const token = await signSession({
      userId: user.id,
      empCode: user.empCode,
      roles: identity.roles,
      unit: user.unit ?? user.employee?.unit ?? null,
      dept: user.dept ?? user.employee?.dept ?? null,
    });
    await record({
      actorType: 'human',
      actorId: user.id,
      action: 'auth.login',
      resourceType: 'session',
      inputs: { method: 'oidc', sub: identity.sub },
    });
    // Hand the session token back to the web app.
    return reply.redirect(`http://localhost:3000/en/auth/callback#token=${token}`);
  });
}
