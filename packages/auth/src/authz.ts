import type { Role } from '@saathi/config';

/** The authenticated actor making a request (human or, later, an agent acting for them). */
export interface Subject {
  userId: string;
  empCode?: string | null;
  roles: Role[];
  unit?: string | null;
  dept?: string | null;
}

/** The thing being acted on. `ownerEmpCode`/`unit` drive ABAC scoping. */
export interface Resource {
  type: string;
  id?: string;
  ownerEmpCode?: string | null;
  unit?: string | null;
}

export interface Decision {
  allowed: boolean;
  /** Human-readable reason, recorded in the audit log for every check. */
  reason: string;
}

const allow = (reason: string): Decision => ({ allowed: true, reason });
const deny = (reason: string): Decision => ({ allowed: false, reason });

const has = (s: Subject, ...roles: Role[]) => roles.some((r) => s.roles.includes(r));
const isOwn = (s: Subject, r?: Resource) =>
  !!s.empCode && !!r?.ownerEmpCode && s.empCode === r.ownerEmpCode;
const sameUnit = (s: Subject, r?: Resource) => !!s.unit && !!r?.unit && s.unit === r.unit;

/**
 * The single authorization check for the whole system. The web/tRPC layer and
 * (from Phase 2) every agent tool call the SAME function, so "an agent can only
 * reach data the requesting user can see" is enforced by identical logic, not a
 * parallel implementation. Phase 0 covers the actions the walking slice needs.
 */
export function can(subject: Subject, action: string, resource?: Resource): Decision {
  if (has(subject, 'admin')) return allow('admin override');

  switch (action) {
    // Read a single employee record.
    case 'employee.read':
      if (isOwn(subject, resource)) return allow('own record');
      if (has(subject, 'hr_officer')) return allow('hr_officer: any employee');
      if (has(subject, 'manager') && sameUnit(subject, resource))
        return allow('manager: same unit');
      return deny('not own record and no HR/manager scope');

    // List/search across employees.
    case 'employee.list':
      return has(subject, 'hr_officer')
        ? allow('hr_officer: list employees')
        : deny('listing employees requires hr_officer');

    // Read the audit / agent-activity log.
    case 'audit.read':
      return has(subject, 'hr_officer')
        ? allow('hr_officer: read audit log')
        : deny('audit log requires hr_officer');

    // Read policy knowledge base + ask the assistant: any authenticated user.
    case 'policy.read':
    case 'saathi.ask':
      return subject.userId ? allow('authenticated user') : deny('not authenticated');

    default:
      // Deny-by-default: an unknown action is never implicitly allowed.
      return deny(`no policy for action "${action}"`);
  }
}
