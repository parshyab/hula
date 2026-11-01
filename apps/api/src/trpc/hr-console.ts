import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { can } from '@saathi/auth';
import { prisma } from '@saathi/db';
import { evaluateLeaveRequest, type LeaveKind } from '@saathi/rules';
import { generateCertificate, type CertificateType } from '@saathi/docs-engine';
import { router, protectedProcedure, publicProcedure } from './trpc';
import { getEmployee, listEmployees, getServiceBook } from '../repo';
import { record } from '../audit';

const LEAVE_TYPES = ['EL', 'CL', 'HPL', 'MATERNITY', 'PATERNITY', 'SPECIAL'] as const;
const DOC_TYPES = ['SALARY_CERTIFICATE', 'SERVICE_CERTIFICATE', 'NOC'] as const;

/** Whole months of service as of now, from a date of joining. */
function monthsOfService(doj: string | null): number {
  if (!doj) return 0;
  const ms = Date.now() - new Date(doj).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24 * 30.4375)));
}

/** HR directory — search + open any employee's record and service book. */
export const employeesRouter = router({
  /** Read one employee — own record always; others need HR/manager scope. */
  get: protectedProcedure.input(z.object({ empCode: z.string() })).query(async ({ ctx, input }) => {
    const emp = await getEmployee(input.empCode);
    const decision = can(ctx.subject, 'employee.read', {
      type: 'employee',
      ownerEmpCode: input.empCode,
      unit: emp?.unit,
    });
    await record({
      actorType: 'human',
      actorId: ctx.subject.userId,
      action: 'employee.read',
      resourceType: 'employee',
      resourceId: input.empCode,
      outputs: { allowed: decision.allowed, reason: decision.reason },
    });
    if (!decision.allowed) throw new TRPCError({ code: 'FORBIDDEN', message: decision.reason });
    if (!emp) throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee not found' });
    return emp;
  }),

  list: protectedProcedure
    .input(z.object({ query: z.string().default(''), limit: z.number().min(1).max(100).default(25) }))
    .query(async ({ ctx, input }) => {
      const decision = can(ctx.subject, 'employee.list');
      if (!decision.allowed) throw new TRPCError({ code: 'FORBIDDEN', message: decision.reason });
      await record({
        actorType: 'human',
        actorId: ctx.subject.userId,
        action: 'employee.list',
        inputs: { query: input.query },
      });
      return listEmployees(input.query, input.limit);
    }),

  serviceBook: protectedProcedure
    .input(z.object({ empCode: z.string() }))
    .query(async ({ ctx, input }) => {
      const emp = await getEmployee(input.empCode);
      const decision = can(ctx.subject, 'servicebook.read', {
        type: 'employee',
        ownerEmpCode: input.empCode,
        unit: emp?.unit,
      });
      if (!decision.allowed) throw new TRPCError({ code: 'FORBIDDEN', message: decision.reason });
      if (!emp) throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee not found' });
      return { employee: emp, entries: await getServiceBook(input.empCode) };
    }),
});

/** Leave: worker submits their own; HR/manager decides with the cited rule. */
export const leaveRouter = router({
  mine: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.subject.empCode) return [];
    const rows = await prisma.leaveRequest.findMany({
      where: { empCode: ctx.subject.empCode },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(serializeLeave);
  }),

  submit: protectedProcedure
    .input(
      z.object({
        leaveType: z.enum(LEAVE_TYPES),
        fromDate: z.string(),
        toDate: z.string(),
        days: z.number().int().min(1).max(60),
        reason: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const empCode = ctx.subject.empCode;
      const decision = can(ctx.subject, 'leave.submit', { type: 'leave', ownerEmpCode: empCode });
      if (!decision.allowed || !empCode) {
        throw new TRPCError({ code: 'FORBIDDEN', message: decision.reason });
      }
      const created = await prisma.leaveRequest.create({
        data: {
          empCode,
          leaveType: input.leaveType,
          fromDate: new Date(input.fromDate),
          toDate: new Date(input.toDate),
          days: input.days,
          reason: input.reason,
          status: 'SUBMITTED',
        },
      });
      await record({
        actorType: 'human',
        actorId: ctx.subject.userId,
        action: 'leave.submit',
        resourceType: 'leaveRequest',
        resourceId: created.id,
        inputs: { leaveType: input.leaveType, days: input.days },
      });
      return serializeLeave(created);
    }),

  inbox: protectedProcedure.query(async ({ ctx }) => {
    const decision = can(ctx.subject, 'leave.inbox');
    if (!decision.allowed) throw new TRPCError({ code: 'FORBIDDEN', message: decision.reason });
    const rows = await prisma.leaveRequest.findMany({
      where: { status: 'SUBMITTED' },
      orderBy: { createdAt: 'asc' },
      include: { employee: true },
    });
    // A manager sees only their unit; HR sees all.
    const scoped = ctx.subject.roles.includes('hr_officer')
      ? rows
      : rows.filter((r) => r.employee.unit === ctx.subject.unit);
    return scoped.map((r) => ({
      ...serializeLeave(r),
      employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
      unit: r.employee.unit,
    }));
  }),

  /** The human decision. Agents have no tool for this. */
  decide: protectedProcedure
    .input(z.object({ id: z.string(), decision: z.enum(['APPROVED', 'REJECTED']), note: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      const req = await prisma.leaveRequest.findUnique({ where: { id: input.id }, include: { employee: true } });
      if (!req) throw new TRPCError({ code: 'NOT_FOUND', message: 'Leave request not found' });

      const decision = can(ctx.subject, 'leave.decide', {
        type: 'leave',
        ownerEmpCode: req.empCode,
        unit: req.employee.unit,
      });
      if (!decision.allowed) throw new TRPCError({ code: 'FORBIDDEN', message: decision.reason });

      // Evaluate against the rule in force — the clause is shown on the decision.
      const evalResult = evaluateLeaveRequest({
        kind: req.leaveType as LeaveKind,
        days: req.days,
        monthsOfService: monthsOfService(req.employee.dateOfJoining?.toISOString() ?? null),
      });

      const updated = await prisma.leaveRequest.update({
        where: { id: req.id },
        data: {
          status: input.decision,
          decidedByUserId: ctx.subject.userId,
          decidedAt: new Date(),
          decisionNote: input.note,
          ruleVersion: evalResult.ruleVersion,
          citedClause: evalResult.clauseRef,
        },
      });
      await record({
        actorType: 'human',
        actorId: ctx.subject.userId,
        action: `leave.${input.decision.toLowerCase()}`,
        resourceType: 'leaveRequest',
        resourceId: req.id,
        inputs: { note: input.note },
        outputs: { eligible: evalResult.eligible, reason: evalResult.reason },
        ruleVersion: evalResult.ruleVersion,
        citedClause: evalResult.clauseRef,
      });
      return { ...serializeLeave(updated), eligibility: evalResult };
    }),
});

/** Document generation + public verification. */
export const documentsRouter = router({
  generate: protectedProcedure
    .input(z.object({ empCode: z.string(), docType: z.enum(DOC_TYPES) }))
    .mutation(async ({ ctx, input }) => {
      const emp = await getEmployee(input.empCode);
      const decision = can(ctx.subject, 'document.generate', {
        type: 'document',
        ownerEmpCode: input.empCode,
      });
      if (!decision.allowed) throw new TRPCError({ code: 'FORBIDDEN', message: decision.reason });
      if (!emp) throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee not found' });

      const cert = await generateCertificate({
        docType: input.docType as CertificateType,
        employee: {
          empCode: emp.empCode,
          name: `${emp.firstName} ${emp.lastName}`,
          grade: emp.grade,
          designation: emp.designation,
          unit: emp.unit,
          payScale: emp.payScale,
          dateOfJoining: emp.dateOfJoining,
        },
        issuedBy: 'HR Department (Saathi)',
        verifyBaseUrl: process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3001',
      });

      await prisma.generatedDocument.create({
        data: {
          empCode: emp.empCode,
          docType: input.docType,
          verifyCode: cert.verifyCode,
          title: cert.title,
          issuedByUserId: ctx.subject.userId,
          summary: cert.summary,
          passwordHint: 'Delivered to the employee; opening requires their PIN.',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        },
      });
      await record({
        actorType: 'human',
        actorId: ctx.subject.userId,
        action: 'document.generate',
        resourceType: 'document',
        resourceId: cert.verifyCode,
        inputs: { docType: input.docType, empCode: emp.empCode },
      });

      return {
        verifyCode: cert.verifyCode,
        title: cert.title,
        filename: `${input.docType.toLowerCase()}_${emp.empCode}.pdf`,
        pdfBase64: Buffer.from(cert.bytes).toString('base64'),
      };
    }),

  /** Public — scanning the QR hits this. No auth: proves authenticity only. */
  verify: publicProcedure.input(z.object({ code: z.string() })).query(async ({ input }) => {
    const doc = await prisma.generatedDocument.findUnique({
      where: { verifyCode: input.code },
      include: { employee: true },
    });
    if (!doc) return { valid: false as const };
    return {
      valid: true as const,
      docType: doc.docType,
      title: doc.title,
      summary: doc.summary,
      employeeName: `${doc.employee.firstName} ${doc.employee.lastName}`,
      empCode: doc.empCode,
      issuedAt: doc.issuedAt.toISOString(),
      expiresAt: doc.expiresAt?.toISOString() ?? null,
    };
  }),
});

function serializeLeave(r: {
  id: string;
  empCode: string;
  leaveType: string;
  fromDate: Date;
  toDate: Date;
  days: number;
  reason: string | null;
  status: string;
  decisionNote: string | null;
  citedClause: string | null;
  createdAt: Date;
}) {
  return {
    id: r.id,
    empCode: r.empCode,
    leaveType: r.leaveType,
    fromDate: r.fromDate.toISOString(),
    toDate: r.toDate.toISOString(),
    days: r.days,
    reason: r.reason,
    status: r.status,
    decisionNote: r.decisionNote,
    citedClause: r.citedClause,
    createdAt: r.createdAt.toISOString(),
  };
}
