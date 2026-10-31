import { describe, expect, it } from 'vitest';
import { computeLeaveAccrual } from './leave';
import { selectEffective, type Dated } from './engine';

describe('leave accrual', () => {
  it('accrues EL at 2.5/month', () => {
    const r = computeLeaveAccrual({ monthsOfService: 12, asOf: new Date('2024-01-01') });
    expect(r.earnedLeave).toBe(30);
    expect(r.casualLeave).toBe(12);
    expect(r.clauseRef).toBe('LEAVE-4.1');
  });

  it('clamps EL at the 300-day cap', () => {
    const r = computeLeaveAccrual({ monthsOfService: 1000, asOf: new Date('2024-01-01') });
    expect(r.earnedLeave).toBe(300);
  });

  it('never goes negative', () => {
    const r = computeLeaveAccrual({ monthsOfService: -5, asOf: new Date('2024-01-01') });
    expect(r.earnedLeave).toBe(0);
  });

  it('throws when no rule is in force yet', () => {
    expect(() => computeLeaveAccrual({ monthsOfService: 12, asOf: new Date('2000-01-01') })).toThrow(
      /No leave accrual rule/,
    );
  });
});

describe('selectEffective', () => {
  interface R extends Dated<{ rate: number }> {}
  const rules: R[] = [
    { version: 'v1', rate: 10, effectiveFrom: new Date('2020-01-01'), effectiveTo: new Date('2023-01-01') },
    { version: 'v2', rate: 20, effectiveFrom: new Date('2023-01-01'), effectiveTo: null },
  ];

  it('picks the window containing the date', () => {
    expect(selectEffective(rules, new Date('2021-06-01'))?.version).toBe('v1');
    expect(selectEffective(rules, new Date('2024-06-01'))?.version).toBe('v2');
  });

  it('returns undefined before any rule applies', () => {
    expect(selectEffective(rules, new Date('2010-01-01'))).toBeUndefined();
  });
});
