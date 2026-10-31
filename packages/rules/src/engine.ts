/**
 * Versioned, date-effective rules engine.
 *
 * Policy is NEVER hardcoded in business logic. Every rule is a config entry
 * carrying `version`, `effectiveFrom` and optional `effectiveTo`. Code asks the
 * engine for the rule in force on a given date, so a DA revision or new LTC
 * limit is a new dated entry — the old one stays intact for recomputing arrears.
 */

export interface EffectiveEntry {
  version: string;
  /** Inclusive start of the window. */
  effectiveFrom: Date;
  /** Exclusive end; null/undefined means "still in force". */
  effectiveTo?: Date | null;
}

export type Dated<T> = T & EffectiveEntry;

/** True if `asOf` falls within [effectiveFrom, effectiveTo). */
export function isInForce(entry: EffectiveEntry, asOf: Date): boolean {
  if (asOf < entry.effectiveFrom) return false;
  if (entry.effectiveTo && asOf >= entry.effectiveTo) return false;
  return true;
}

/**
 * Select the rule in force on `asOf`. If several windows overlap, the one with
 * the latest `effectiveFrom` wins (the most recent amendment). Returns
 * `undefined` when nothing is in force — callers must handle that rather than
 * fall back to a hidden default.
 */
export function selectEffective<T extends EffectiveEntry>(entries: T[], asOf: Date): T | undefined {
  return entries
    .filter((e) => isInForce(e, asOf))
    .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())[0];
}

/** Like `selectEffective` but throws with context when nothing applies. */
export function requireEffective<T extends EffectiveEntry>(
  entries: T[],
  asOf: Date,
  label: string,
): T {
  const rule = selectEffective(entries, asOf);
  if (!rule) {
    throw new Error(`No ${label} rule in force on ${asOf.toISOString().slice(0, 10)}`);
  }
  return rule;
}
