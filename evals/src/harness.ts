import { MockModel } from '@saathi/llm';
import type { Subject } from '@saathi/auth';
import { runHrSaathi, type PolicyHit, type SaathiAnswer } from '@saathi/agents';
import type { Locale } from '@saathi/config';

/** A tiny in-memory policy knowledge base for evals. Phase 1 swaps this for the
 *  real pgvector-backed corpus; the eval shape stays identical. */
const KB: Record<string, PolicyHit> = {
  'casual leave policy rules clause': {
    clauseRef: 'LEAVE-3.2',
    heading: 'Casual Leave',
    content: 'An employee is entitled to 12 days of Casual Leave per calendar year.',
  },
  'earned leave accrual policy rules clause': {
    clauseRef: 'LEAVE-4.1',
    heading: 'Earned Leave',
    content: 'Earned Leave accrues at 2.5 days per completed month of service.',
  },
};

const subject: Subject = { userId: 'eval-user', empCode: 'E-10002', roles: ['employee'], unit: 'CDU' };

/** Run HR Saathi against the eval KB with a fresh deterministic mock. */
export function runCase(question: string, locale: Locale = 'en'): Promise<SaathiAnswer> {
  return runHrSaathi({
    subject,
    question,
    locale,
    gateway: new MockModel(),
    recordAudit: async () => undefined,
    getProfile: async () => ({
      empCode: 'E-10002',
      firstName: 'Arnab',
      lastName: 'Saikia',
      grade: 'E-2',
      unit: 'CDU',
      designation: 'Officer',
    }),
    getLeaveBalance: async () => ({ earnedLeave: 30, casualLeave: 12, clauseRef: 'LEAVE-4.1', ruleVersion: 'v1' }),
    searchPolicy: async (q) => {
      const key = Object.keys(KB).find((k) => k.split(' ').every((w) => q.toLowerCase().includes(w)));
      return key ? KB[key]! : null;
    },
  });
}
