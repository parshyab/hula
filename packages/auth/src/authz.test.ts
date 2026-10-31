import { describe, expect, it } from 'vitest';
import { can, type Subject } from './authz';

const employee: Subject = {
  userId: 'u1',
  empCode: 'E-10002',
  roles: ['employee'],
  unit: 'Hydrocracker',
};
const hr: Subject = { userId: 'u2', empCode: 'E-10001', roles: ['employee', 'hr_officer'], unit: 'HQ-Guwahati' };
const manager: Subject = { userId: 'u3', empCode: 'E-10050', roles: ['manager'], unit: 'Hydrocracker' };
const admin: Subject = { userId: 'u4', roles: ['admin'] };

describe('can() — RBAC + ABAC', () => {
  it('lets an employee read their own record', () => {
    expect(can(employee, 'employee.read', { type: 'employee', ownerEmpCode: 'E-10002' }).allowed).toBe(
      true,
    );
  });

  it('stops an employee reading someone else', () => {
    expect(can(employee, 'employee.read', { type: 'employee', ownerEmpCode: 'E-10001' }).allowed).toBe(
      false,
    );
  });

  it('lets HR read any employee', () => {
    expect(can(hr, 'employee.read', { type: 'employee', ownerEmpCode: 'E-99999' }).allowed).toBe(true);
  });

  it('lets a manager read within their unit only', () => {
    expect(
      can(manager, 'employee.read', { type: 'employee', ownerEmpCode: 'E-1', unit: 'Hydrocracker' })
        .allowed,
    ).toBe(true);
    expect(
      can(manager, 'employee.read', { type: 'employee', ownerEmpCode: 'E-1', unit: 'CDU' }).allowed,
    ).toBe(false);
  });

  it('gates the audit log to HR', () => {
    expect(can(employee, 'audit.read').allowed).toBe(false);
    expect(can(hr, 'audit.read').allowed).toBe(true);
  });

  it('lets any authenticated user ask Saathi and read policy', () => {
    expect(can(employee, 'saathi.ask').allowed).toBe(true);
    expect(can(employee, 'policy.read').allowed).toBe(true);
  });

  it('admin overrides everything', () => {
    expect(can(admin, 'employee.list').allowed).toBe(true);
  });

  it('denies unknown actions by default', () => {
    expect(can(admin, 'payroll.lock').allowed).toBe(true); // admin override
    expect(can(hr, 'payroll.lock').allowed).toBe(false); // no policy yet → deny
  });
});
