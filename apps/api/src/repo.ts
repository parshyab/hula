import { prisma } from '@saathi/db';
import { computeLeaveAccrual } from '@saathi/rules';

/** Employee fields safe to expose — masked PII only, never tokens or plaintext. */
export interface EmployeeDTO {
  empCode: string;
  firstName: string;
  lastName: string;
  grade: string | null;
  payScale: string | null;
  unit: string | null;
  dept: string | null;
  designation: string | null;
  status: string;
  dateOfJoining: string | null;
  panMasked: string | null;
  bankMasked: string | null;
}

export async function getEmployee(empCode: string): Promise<EmployeeDTO | null> {
  const e = await prisma.employee.findUnique({ where: { empCode } });
  if (!e) return null;
  return {
    empCode: e.empCode,
    firstName: e.firstName,
    lastName: e.lastName,
    grade: e.grade,
    payScale: e.payScale,
    unit: e.unit,
    dept: e.dept,
    designation: e.designation,
    status: e.status,
    dateOfJoining: e.dateOfJoining?.toISOString() ?? null,
    panMasked: e.panMasked,
    bankMasked: e.bankMasked,
  };
}

/** Leave balance derived from the rules engine (never hardcoded). */
export async function getLeaveBalance(empCode: string, asOf = new Date()) {
  const e = await prisma.employee.findUnique({ where: { empCode } });
  if (!e?.dateOfJoining) return null;
  const months = Math.max(
    0,
    Math.floor((asOf.getTime() - e.dateOfJoining.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)),
  );
  return computeLeaveAccrual({ monthsOfService: months, asOf });
}
