import { z } from 'zod';

/**
 * Server-side environment schema. Validated once at startup so a
 * misconfigured deployment fails fast and loudly rather than at request time.
 * Never import this into client bundles — only NEXT_PUBLIC_* values are safe there.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z.string().url(),

  KEYCLOAK_URL: z.string().url(),
  KEYCLOAK_REALM: z.string().min(1),
  KEYCLOAK_CLIENT_ID: z.string().min(1),
  KEYCLOAK_CLIENT_SECRET: z.string().min(1),

  API_PORT: z.coerce.number().int().positive().default(4000),
  SESSION_SECRET: z.string().min(16),

  LLM_PROVIDER: z.enum(['mock', 'claude', 'onprem']).default('mock'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-opus-4-8'),
  ONPREM_LLM_URL: z.string().optional(),

  PII_ENCRYPTION_KEY: z.string().min(16),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

/** Parse and cache process.env against the schema. Throws on invalid config. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
