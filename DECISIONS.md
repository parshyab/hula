# Architecture Decision Record

ADR-style log. Newest first. Each entry: context → decision → consequences.

---

## ADR-0009 — Service worker + manifest for the PWA shell (Phase 0)

**Context.** Most users are on mobile; the employee app must be installable and
survive a flaky refinery network.
**Decision.** Hand-written `manifest.webmanifest` + a network-first service
worker caching the app shell, rather than pulling in `next-pwa`.
**Consequences.** Fewer deps and full control. Offline *data* (queued requests,
cached payslips) is explicitly deferred to a later phase.

## ADR-0008 — Fonts via OS-provided Noto stacks in Phase 0

**Context.** Assamese (Bengali script) and Hindi (Devanagari) must render
correctly, but the system must build/run on-prem with no internet dependency
except the LLM adapter — so `next/font/google` (build-time fetch) is unsuitable.
**Decision.** CSS font stacks that prefer `Noto Sans Devanagari` / `Noto Sans
Bengali` / `Inter` and fall back to OS fonts. Production self-hosts the Noto
fonts on-prem.
**Consequences.** Offline-safe builds now; a follow-up self-hosts the font files.

## ADR-0007 — Auth: Keycloak (console) + OTP/PIN (mobile), unified on a session token

**Context.** HR staff use the web console; workmen use mobile/WhatsApp/kiosk.
**Decision.** Keycloak OIDC for the console and OTP+PIN for mobile both converge
on a Saathi-issued session JWT, so the API has one way to identify a caller.
A lean auto-imported realm (`infra/keycloak/realm-saathi.json`) with a few roles
and attribute→claim mappers; full role/ABAC modelling comes later.
**Consequences.** One authorization path downstream. Keycloak stays optional for
the offline mobile demo.

## ADR-0006 — `can()` is the single authorization check

**Context.** "Agents can only reach data the requesting user can see" must be
real, not aspirational.
**Decision.** One pure `can(subject, action, resource)` in `@saathi/auth`,
deny-by-default, used by tRPC procedures now and by every agent tool later.
**Consequences.** RBAC + ABAC live in one tested place; no parallel agent-side
logic to drift.

## ADR-0005 — Append-only, hash-chained audit log

**Context.** Vigilance and auditors need tamper-evidence of every human and
agent action.
**Decision.** A single `record()` writer; each event stores `prevHash` and
`hash = sha256(prevHash + canonical(payload))`. `verifyChain()` walks the chain.
Writes are serialized in-process for Phase 0 (DB advisory lock when scaled out).
**Consequences.** Any edit to a past event breaks verification. `Why?`/`Undo`
build on this feed.

## ADR-0004 — Rules are versioned, date-effective config

**Context.** DA revisions, LTC limits and leave rules change and must recompute
arrears against the rule that was in force.
**Decision.** `@saathi/rules`: every rule carries `version` + `effectiveFrom`/
`effectiveTo`; `selectEffective(asOf)` resolves the active one. Nothing hardcoded.
**Consequences.** New circulars are new dated entries; old rules stay intact.

## ADR-0003 — All models behind a gateway interface; MockModel is the Phase 0 default

**Context.** Must run on-prem offline, keep a slot for an India-hosted/on-prem
model, and never leak a vendor SDK into app code.
**Decision.** `@saathi/llm` exposes `ModelGateway`; `MockModel` (deterministic,
offline) is default. `ClaudeModel`/`OnPremModel` are stubs that fail loudly if
selected before implementation.
**Consequences.** Deterministic agent evals; model swappable per environment.

## ADR-0002 — Internal packages consumed as TypeScript source

**Context.** A pre-build step across many workspace packages adds ordering pain.
**Decision.** `@saathi/*` packages export `./src/index.ts` directly; apps
transpile them (tsx for Node, `transpilePackages` for Next, esbuild for Vitest).
`build` is a no-op; `typecheck` is `tsc --noEmit`.
**Consequences.** Simple, fast local dev. If a package is ever published
externally it will need a real build step.

## ADR-0001 — Monorepo: pnpm workspaces + Turborepo, strict TS

**Context.** Many apps/packages sharing types and rules.
**Decision.** pnpm (via corepack) + Turborepo, TypeScript strict everywhere,
shared `tsconfig.base.json`, root ESLint flat config + Prettier.
**Consequences.** One install, cached task graph, shared config.
