import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from './context';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/** Procedures that require an authenticated subject. */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.subject) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sign in required' });
  }
  return next({ ctx: { ...ctx, subject: ctx.subject } });
});
