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

export type LeaveKind = 'EL' | 'CL' | 'HPL' | 'MATERNITY' | 'PATERNITY' | 'SPECIAL';

export interface LeaveEligibilityInput {
  kind: LeaveKind;
  days: number;
  monthsOfService: number;
  asOf?: Date;
}

export interface LeaveEligibility {
  eligible: boolean;
  reason: string;
  clauseRef: string;
  ruleVersion: string;
}

/**
 * Judge a leave request against the rule in force. Pure — the API feeds it the
 * employee's service length and the request; the UI/approval shows the clause.
 */
export function evaluateLeaveRequest(input: LeaveEligibilityInput): LeaveEligibility {
  const asOf = input.asOf ?? new Date();
  const rule = requireEffective(leaveAccrualRules, asOf, 'leave accrual');
  const accrual = computeLeaveAccrual({ monthsOfService: input.monthsOfService, asOf });
  const base = { clauseRef: rule.clauseRef, ruleVersion: rule.version };

  if (input.days <= 0) {
    return { eligible: false, reason: 'Request must be at least 1 day.', ...base };
  }
  if (input.kind === 'CL') {
    if (input.days > rule.clPerYear) {
      return {
        eligible: false,
        reason: `CL request (${input.days}d) exceeds the annual entitlement of ${rule.clPerYear} days.`,
        ...base,
      };
    }
    return { eligible: true, reason: `Within the ${rule.clPerYear}-day CL entitlement.`, ...base };
  }
  if (input.kind === 'EL') {
    if (input.days > accrual.earnedLeave) {
      return {
        eligible: false,
        reason: `EL request (${input.days}d) exceeds the accrued balance of ${accrual.earnedLeave} days.`,
        ...base,
      };
    }
    return { eligible: true, reason: `Within the accrued EL balance of ${accrual.earnedLeave} days.`, ...base };
  }
  // Other leave kinds have no automated check in this slice.
  return { eligible: true, reason: 'No automated limit for this leave type; HR to review.', ...base };
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
