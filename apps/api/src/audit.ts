import { createHash } from 'node:crypto';
import { prisma } from '@saathi/db';
import type { ActorType } from '@saathi/config';

/** First link in the chain — the "previous hash" of the very first event. */
export const GENESIS_HASH = '0'.repeat(64);

export interface AuditInput {
  actorType: ActorType;
  actorId: string;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  inputs?: unknown;
  outputs?: unknown;
  ruleVersion?: string | null;
  citedClause?: string | null;
  modelUsed?: string | null;
}

/** Stable JSON: object keys sorted recursively, so the hash is deterministic. */
function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(',')}}`;
}

function computeHash(prevHash: string, payload: Record<string, unknown>): string {
  return createHash('sha256').update(prevHash + canonical(payload)).digest('hex');
}

/**
 * The ONLY writer of the audit log. Appends one hash-chained event. Serialized
 * through a single in-process promise chain so concurrent calls can't race on
 * `prevHash` (Phase 0 is single-process; a DB advisory lock replaces this when
 * the API scales out).
 */
let tail: Promise<unknown> = Promise.resolve();

export function record(input: AuditInput) {
  const run = async () => {
    const last = await prisma.auditEvent.findFirst({ orderBy: { seq: 'desc' } });
    const prevHash = last?.hash ?? GENESIS_HASH;
    const createdAt = new Date();
    const payload = {
      actorType: input.actorType,
      actorId: input.actorId,
      action: input.action,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
      inputs: input.inputs ?? null,
      outputs: input.outputs ?? null,
      ruleVersion: input.ruleVersion ?? null,
      citedClause: input.citedClause ?? null,
      modelUsed: input.modelUsed ?? null,
      createdAt: createdAt.toISOString(),
    };
    const hash = computeHash(prevHash, payload);
    return prisma.auditEvent.create({
      data: {
        actorType: payload.actorType,
        actorId: payload.actorId,
        action: payload.action,
        resourceType: payload.resourceType,
        resourceId: payload.resourceId,
        inputs: payload.inputs as object,
        outputs: payload.outputs as object,
        ruleVersion: payload.ruleVersion,
        citedClause: payload.citedClause,
        modelUsed: payload.modelUsed,
        prevHash,
        hash,
        createdAt,
      },
    });
  };
  const result = tail.then(run, run);
  // Keep the chain going even if one write rejects.
  tail = result.catch(() => undefined);
  return result;
}

export interface ChainVerification {
  ok: boolean;
  count: number;
  brokenAtSeq?: bigint;
  reason?: string;
}

/** Walk the whole chain and confirm every link recomputes and references correctly. */
export async function verifyChain(): Promise<ChainVerification> {
  const events = await prisma.auditEvent.findMany({ orderBy: { seq: 'asc' } });
  let prevHash = GENESIS_HASH;
  for (const e of events) {
    if (e.prevHash !== prevHash) {
      return { ok: false, count: events.length, brokenAtSeq: e.seq, reason: 'prevHash mismatch' };
    }
    const payload = {
      actorType: e.actorType,
      actorId: e.actorId,
      action: e.action,
      resourceType: e.resourceType,
      resourceId: e.resourceId,
      inputs: e.inputs ?? null,
      outputs: e.outputs ?? null,
      ruleVersion: e.ruleVersion,
      citedClause: e.citedClause,
      modelUsed: e.modelUsed,
      createdAt: e.createdAt.toISOString(),
    };
    if (computeHash(prevHash, payload) !== e.hash) {
      return { ok: false, count: events.length, brokenAtSeq: e.seq, reason: 'hash mismatch (tampered)' };
    }
    prevHash = e.hash;
  }
  return { ok: true, count: events.length };
}

export const _test = { canonical, computeHash };
