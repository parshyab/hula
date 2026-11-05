# Saathi HRMS — agent-first HRMS

A standalone, mobile-first HRMS. Our own system of record — **no SAP**. Agents
prepare the work; humans decide it. English, Hindi and Assamese throughout.

> **Phase 0 (Foundations).** This is the walking skeleton: the monorepo, infra,
> auth, RBAC/ABAC, the hash-chained audit log, the versioned rules engine, the
> model gateway (offline mock), the design system, trilingual i18n — and one
> vertical slice that boots end-to-end: **log in → see your own profile → ask HR
> Saathi → watch the agent's action appear in the audit feed.**

## Stack

pnpm + Turborepo · TypeScript strict · Next.js (App Router, PWA) · Fastify +
tRPC + REST/OpenAPI · agent runtime behind a model gateway · PostgreSQL + Prisma
+ pgvector · Keycloak (OIDC) + OTP/PIN · Docker Compose · Vitest/Playwright/evals.

## Layout

```
apps/      web (PWA console), api (Fastify+tRPC), agents (HR Saathi runtime)
packages/  config, db (Prisma), auth, rules, llm (gateway + mock), ui (+Storybook)
evals/     agent eval suite        infra/  postgres init, keycloak realm
```

## Prerequisites

- Node ≥ 22, Docker. pnpm is managed by corepack (`corepack enable`).

## Run it

```bash
corepack enable
pnpm install

cp .env.example .env            # already present in this repo for the demo
pnpm infra:up                   # Postgres (pgvector) + Keycloak
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm dev                        # api on :4000, web on :3000
```

> **Fully offline demo:** the mobile OTP+PIN path needs only Postgres — Keycloak
> is optional (it's the web-console sign-in). `LLM_PROVIDER=mock` means no model
> API or internet is required.

## Phase 0 demo script

1. Open **http://localhost:3000** → you're sent to the sign-in page (mobile is
   prefilled with the seeded HR user `9435000001`).
2. Click **Send OTP** — in dev the OTP is shown on screen. Enter it and PIN
   **`1234`**, then **Sign in**.
3. **My profile** shows your own record — note PAN/bank are **masked**.
4. In **Ask HR Saathi**, type *"How much leave do I have left?"* → the agent
   calls its (user-scoped) tool via the mock model and answers with a balance and
   a **cited policy clause**. Tap the **AI** badge for the **Why?** drawer
   (model + tools + clause). Try a question with no source → it refuses honestly.
5. Switch the language selector to **हिन्दी / অসমীয়া** — UI and Saathi's answer
   change language and render Devanagari/Assamese correctly.
6. Open **Activity** → every step above is in the hash-chained feed, with human
   vs **agent** actions distinguished. (HR-only; the plain employee
   `9435000002` / PIN `1234` sees a "HR only" message — that's RBAC working.)
7. Run **`pnpm audit:verify`** → confirms the audit chain is intact end-to-end.

## Tests

```bash
pnpm test        # rules engine, audit hash-chain, can() matrix, mock model, agent
pnpm evals       # agent eval suite (policy citations + guardrails)
pnpm typecheck   # strict TS across the workspace
pnpm storybook   # design-system components
```

## What's next (Phase 1)

Employee master + service-book timeline, attendance + leave, contract-labour core
+ gate pass, HR Saathi on the WhatsApp simulator with "documents in 10 seconds",
the real pgvector policy KB, and the activity feed's Why?/Undo. See
[DECISIONS.md](DECISIONS.md) for the architectural record.
