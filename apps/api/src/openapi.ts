/**
 * Minimal OpenAPI shell for external integrations. The internal, type-safe API
 * is tRPC; this REST surface is the stable contract third parties (banks, PF/ESI
 * portals, biometric devices) integrate against. Phase 0 documents only the
 * health + auth endpoints; module endpoints are added per phase.
 */
export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Saathi HRMS — External API',
    version: '0.0.0',
    description: 'On-prem HRMS for NRL. Phase 0 shell.',
  },
  servers: [{ url: 'http://localhost:4000' }],
  paths: {
    '/health': {
      get: {
        summary: 'Service health',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/auth/otp/request': {
      post: {
        summary: 'Request a login OTP for a mobile number',
        responses: { '200': { description: 'OTP issued' } },
      },
    },
    '/auth/otp/verify': {
      post: {
        summary: 'Verify OTP + PIN and receive a session token',
        responses: { '200': { description: 'Session token' }, '401': { description: 'Rejected' } },
      },
    },
  },
} as const;
