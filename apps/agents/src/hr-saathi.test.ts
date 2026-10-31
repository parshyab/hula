import { describe, expect, it, vi } from 'vitest';
import { MockModel } from '@saathi/llm';
import type { Subject } from '@saathi/auth';
import { runHrSaathi, HR_SAATHI_TOOL_NAMES } from './hr-saathi';
import type { SaathiDeps } from './types';

const subject: Subject = { userId: 'u1', empCode: 'E-10002', roles: ['employee'], unit: 'CDU' };

function deps(over: Partial<SaathiDeps> = {}): SaathiDeps {
  return {
    subject,
    question: 'how much leave do I have?',
    locale: 'en',
    gateway: new MockModel(),
    recordAudit: vi.fn().mockResolvedValue(undefined),
    getProfile: async () => ({
      empCode: 'E-10002',
      firstName: 'Arnab',
      lastName: 'Saikia',
      grade: 'E-2',
      unit: 'CDU',
      designation: 'Officer',
    }),
    getLeaveBalance: async () => ({ earnedLeave: 30, casualLeave: 12, clauseRef: 'LEAVE-4.1', ruleVersion: 'v1' }),
    searchPolicy: async () => null,
    ...over,
  };
}

describe('HR Saathi', () => {
  it('answers a leave question with a cited clause and records the agent action', async () => {
    const d = deps();
    const res = await runHrSaathi(d);
    expect(res.answer).toContain('Earned Leave');
    expect(res.citedClause).toBe('LEAVE-4.1');
    expect(res.toolsUsed).toContain('getLeaveBalance');
    // Agent action was audited (never conflated with a human actor).
    expect(d.recordAudit).toHaveBeenCalled();
    const calls = (d.recordAudit as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.every(([i]) => i.actorType === 'agent')).toBe(true);
  });

  it('refuses to guess when policy retrieval finds nothing', async () => {
    const d = deps({ question: 'what is the dress code policy?', searchPolicy: async () => null });
    const res = await runHrSaathi(d);
    expect(res.answer).toMatch(/raise a query with HR/);
    expect(res.citedClause).toBeNull();
  });

  it('cites the clause when policy retrieval hits', async () => {
    const d = deps({
      question: 'tell me the casual leave policy rules clause',
      searchPolicy: async () => ({ clauseRef: 'LEAVE-3.2', heading: 'Casual Leave', content: 'CL is 12 days.' }),
    });
    const res = await runHrSaathi(d);
    expect(res.citedClause).toBe('LEAVE-3.2');
    expect(res.answer).toContain('LEAVE-3.2');
  });

  it('has NO tool to approve, pay, score or touch disciplinary/POSH content', () => {
    const forbidden = /approve|pay|payment|score|apar|disciplin|posh|sanction/i;
    expect(HR_SAATHI_TOOL_NAMES.some((n) => forbidden.test(n))).toBe(false);
  });
});
