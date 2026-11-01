import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { can } from '@saathi/auth';
import { LOCALES } from '@saathi/config';
import { prisma } from '@saathi/db';
import { getGateway } from '@saathi/llm';
import { runHrSaathi } from '@saathi/agents';
import { router, protectedProcedure } from './trpc';
import { getEmployee, getLeaveBalance } from '../repo';
import { record } from '../audit';
import { env } from '../env';
import { employeesRouter, leaveRouter, documentsRouter } from './hr-console';

const gateway = getGateway({
  provider: env.LLM_PROVIDER,
  anthropicApiKey: env.ANTHROPIC_API_KEY,
  anthropicModel: env.ANTHROPIC_MODEL,
  onpremUrl: env.ONPREM_LLM_URL,
});

export const appRouter = router({
  /** The signed-in user's own profile. */
  me: router({
    profile: protectedProcedure.query(async ({ ctx }) => {
      const { subject } = ctx;
      if (!subject.empCode) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No employee record linked to this login' });
      }
      const decision = can(subject, 'employee.read', {
        type: 'employee',
        ownerEmpCode: subject.empCode,
      });
      // (always allowed — own record — but recorded for completeness)
      const emp = await getEmployee(subject.empCode);
      await record({
        actorType: 'human',
        actorId: subject.userId,
        action: 'employee.read',
        resourceType: 'employee',
        resourceId: subject.empCode,
        outputs: { allowed: decision.allowed, reason: decision.reason },
      });
      if (!emp) throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee not found' });
      return emp;
    }),
  }),

  /** HR directory: search, open a record, read the service book. */
  employees: employeesRouter,

  /** Leave: worker submits; HR/manager decides with the cited rule. */
  leave: leaveRouter,

  /** Document generation + public QR verification. */
  documents: documentsRouter,

  /** The agent + human activity feed (Why?/Undo is layered on top in Phase 1). */
  audit: router({
    feed: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(25) }))
      .query(async ({ ctx, input }) => {
        const decision = can(ctx.subject, 'audit.read');
        if (!decision.allowed) throw new TRPCError({ code: 'FORBIDDEN', message: decision.reason });
        const events = await prisma.auditEvent.findMany({
          orderBy: { seq: 'desc' },
          take: input.limit,
        });
        return events.map((e) => ({
          seq: e.seq.toString(),
          actorType: e.actorType,
          actorId: e.actorId,
          action: e.action,
          resourceType: e.resourceType,
          resourceId: e.resourceId,
          ruleVersion: e.ruleVersion,
          citedClause: e.citedClause,
          modelUsed: e.modelUsed,
          hash: e.hash,
          createdAt: e.createdAt.toISOString(),
        }));
      }),
  }),

  /** HR Saathi — ask a question; the agent uses the mock model + tools. */
  saathi: router({
    ask: protectedProcedure
      .input(z.object({ question: z.string().min(1), locale: z.enum(LOCALES).default('en') }))
      .mutation(async ({ ctx, input }) => {
        const decision = can(ctx.subject, 'saathi.ask');
        if (!decision.allowed) throw new TRPCError({ code: 'FORBIDDEN', message: decision.reason });
        return runHrSaathi({
          subject: ctx.subject,
          question: input.question,
          locale: input.locale,
          gateway,
          recordAudit: (i) => record(i).then(() => undefined),
          getProfile: getEmployee,
          getLeaveBalance,
          searchPolicy: async (query, lang) => {
            // Phase 0 retrieval is a simple keyword match over policy chunks.
            const terms = query.toLowerCase();
            const chunks = await prisma.policyChunk.findMany({ where: { lang } });
            const hit =
              chunks.find((c) =>
                `${c.heading} ${c.content}`.toLowerCase().split(/\s+/).some((w) => w.length > 3 && terms.includes(w)),
              ) ?? null;
            return hit ? { clauseRef: hit.clauseRef, heading: hit.heading, content: hit.content } : null;
          },
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
