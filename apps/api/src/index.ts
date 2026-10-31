import Fastify from 'fastify';
import cors from '@fastify/cors';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { env } from './env';
import { appRouter } from './trpc/router';
import { createContext } from './trpc/context';
import { authRoutes } from './routes/auth';
import { openApiDocument } from './openapi';

async function main() {
  const app = Fastify({ logger: { level: 'info' } });

  await app.register(cors, { origin: true, credentials: true });

  // Internal API for the web console + mobile apps (type-safe).
  await app.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: { router: appRouter, createContext },
  });

  await app.register(authRoutes);

  // External integrations (REST/OpenAPI shell — expanded in later phases).
  app.get('/health', async () => ({ status: 'ok', service: 'saathi-api', llm: env.LLM_PROVIDER }));
  app.get('/openapi.json', async () => openApiDocument);

  const port = env.API_PORT;
  await app.listen({ port, host: '0.0.0.0' });
  app.log.info(`Saathi API listening on http://localhost:${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
