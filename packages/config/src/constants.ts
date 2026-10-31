/** Shared, framework-free domain constants used across apps and packages. */

/** Supported UI / agent / document languages. */
export const LOCALES = ['en', 'hi', 'as'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  hi: 'हिन्दी',
  as: 'অসমীয়া',
};

/**
 * Realm roles. Kept in sync with infra/keycloak/realm-saathi.json.
 * RBAC checks reference these by name.
 */
export const ROLES = [
  'employee',
  'hr_officer',
  'manager',
  'payroll_head',
  'safety_officer',
  'admin',
] as const;
export type Role = (typeof ROLES)[number];

/** Refinery units / locations used for ABAC scoping. */
export const UNITS = [
  'Hydrocracker',
  'CDU',
  'DHDT',
  'Utilities',
  'Marketing-Terminal-Siliguri',
  'HQ-Guwahati',
] as const;
export type Unit = (typeof UNITS)[number];

/**
 * Actor type for the audit log. A human user or an agent — never conflated,
 * so "who did what" is always answerable.
 */
export const ACTOR_TYPES = ['human', 'agent'] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];
