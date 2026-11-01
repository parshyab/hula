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

/** Directory search for HR — by name, employee code, unit or dept. */
export async function listEmployees(query: string, limit = 25): Promise<EmployeeDTO[]> {
  const q = query.trim();
  const where = q
    ? {
        OR: [
          { empCode: { contains: q, mode: 'insensitive' as const } },
          { firstName: { contains: q, mode: 'insensitive' as const } },
          { lastName: { contains: q, mode: 'insensitive' as const } },
          { unit: { contains: q, mode: 'insensitive' as const } },
          { dept: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {};
  const rows = await prisma.employee.findMany({ where, take: limit, orderBy: { empCode: 'asc' } });
  return rows.map(toDTO);
}

/** The immutable service-book timeline, newest first. */
export async function getServiceBook(empCode: string) {
  const rows = await prisma.serviceBookEntry.findMany({
    where: { empCode },
    orderBy: { effectiveDate: 'desc' },
  });
  return rows.map((r) => ({
    id: r.id,
    entryType: r.entryType,
    effectiveDate: r.effectiveDate.toISOString(),
    title: r.title,
    detail: r.detail,
    orderRef: r.orderRef,
  }));
}

function toDTO(e: {
  empCode: string;
  firstName: string;
  lastName: string;
  grade: string | null;
  payScale: string | null;
  unit: string | null;
  dept: string | null;
  designation: string | null;
  status: string;
  dateOfJoining: Date | null;
  panMasked: string | null;
  bankMasked: string | null;
}): EmployeeDTO {
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

export async function getEmployee(empCode: string): Promise<EmployeeDTO | null> {
  const e = await prisma.employee.findUnique({ where: { empCode } });
  return e ? toDTO(e) : null;
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
