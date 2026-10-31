import { PrismaClient } from '@prisma/client';

/**
 * A single PrismaClient per process. In dev we stash it on globalThis so hot
 * reload (tsx watch / Next) doesn't open a new pool on every reload.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export * from '@prisma/client';
