import { type Dated, requireEffective } from './engine';

/**
 * Sample ruleset: leave accrual. Proves the shape later modules (payroll DA,
 * LTC limits, TA/DA) will follow. The clause refs point back at the policy KB
 * so an agent answer can cite the same source the number came from.
 */
export interface LeaveAccrualRule {
  /** Earned Leave accrued per completed month of service. */
  elPerMonth: number;
  /** Maximum EL that can be accumulated. */
  elMaxAccumulation: number;
  /** Casual Leave granted per calendar year. */
  clPerYear: number;
  /** Policy clause this rule implements. */
  clauseRef: string;
}

export const leaveAccrualRules: Dated<LeaveAccrualRule>[] = [
  {
    version: 'v1',
    effectiveFrom: new Date('2015-01-01'),
    effectiveTo: null,
    elPerMonth: 2.5,
    elMaxAccumulation: 300,
    clPerYear: 12,
    clauseRef: 'LEAVE-4.1',
  },
];

export interface LeaveAccrualInput {
  monthsOfService: number;
  asOf?: Date;
}

export interface LeaveAccrualResult {
  earnedLeave: number;
  casualLeave: number;
  ruleVersion: string;
  clauseRef: string;
}

/** Pure computation — no I/O. Clamped at the accumulation cap. */
export function computeLeaveAccrual(input: LeaveAccrualInput): LeaveAccrualResult {
  const asOf = input.asOf ?? new Date();
  const rule = requireEffective(leaveAccrualRules, asOf, 'leave accrual');
  const earnedLeave = Math.min(
    rule.elMaxAccumulation,
    Math.max(0, input.monthsOfService) * rule.elPerMonth,
  );
  return {
    earnedLeave,
    casualLeave: rule.clPerYear,
    ruleVersion: rule.version,
    clauseRef: rule.clauseRef,
  };
}
