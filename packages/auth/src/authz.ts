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

    // Read an employee's service book — same scope as reading the record.
    case 'servicebook.read':
      if (isOwn(subject, resource)) return allow('own service book');
      if (has(subject, 'hr_officer')) return allow('hr_officer: any service book');
      if (has(subject, 'manager') && sameUnit(subject, resource))
        return allow('manager: same unit');
      return deny('not own and no HR/manager scope');

    // A worker submits their OWN leave request (or Saathi drafts it for them).
    case 'leave.submit':
      return isOwn(subject, resource)
        ? allow('own leave request')
        : deny('can only submit own leave');

    // The HR/manager leave inbox.
    case 'leave.inbox':
      if (has(subject, 'hr_officer')) return allow('hr_officer: leave inbox');
      if (has(subject, 'manager')) return allow('manager: leave inbox');
      return deny('inbox requires hr_officer or manager');

    // Deciding a leave request — a HUMAN action, never the requester themselves.
    case 'leave.decide':
      if (isOwn(subject, resource)) return deny('cannot decide your own request');
      if (has(subject, 'hr_officer')) return allow('hr_officer: decide leave');
      if (has(subject, 'manager') && sameUnit(subject, resource))
        return allow('manager: decide same-unit leave');
      return deny('deciding leave requires hr_officer or same-unit manager');

    // Generate a certificate — HR issues them; a worker may request their own.
    case 'document.generate':
      if (has(subject, 'hr_officer')) return allow('hr_officer: issue document');
      if (isOwn(subject, resource)) return allow('own document request');
      return deny('issuing documents requires hr_officer');

    // Read policy knowledge base + ask the assistant: any authenticated user.
    case 'policy.read':
    case 'saathi.ask':
      return subject.userId ? allow('authenticated user') : deny('not authenticated');

    default:
      // Deny-by-default: an unknown action is never implicitly allowed.
      return deny(`no policy for action "${action}"`);
  }
}
