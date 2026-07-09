# bullwatch — Agent Handoff / Build Plan

**You are continuing an in-progress build.** Read this whole file first, then continue from
"Current status" → "Remaining work" in order. Do **atomic conventional commits** as you go
(see "Commit rules"). This file is the source of truth for scope and decisions — keep it
updated as you complete sections (tick the checklist at the bottom).

---

## What we're building

`bullwatch` — a restyled, feature-rich dashboard for **BullMQ**. It borrows trigger.dev's
UX (faceted filters, rich run/job detail, inline actions) but is styled in a **clean light
theme like [dub](/Users/mike/Code/dub)** — NOT trigger.dev's dark theme. It embeds into a
user's existing Node app via a thin **server adapter** (one per framework) and renders a
React SPA that polls a REST API. It uses the host app's **own `bullmq` instance**, so job
mutations (retry/promote/remove/clean) are always version-correct.

This is a fork of **bull-board**'s proven architecture (`/Users/mike/Code/bull-board`), with
a new UI, more features, and restructured to the owner's code conventions.

### The five locked product decisions
1. **v1 feature cut:** queue list, job list + detail, per-job actions (retry/promote/remove/
   clean), pause/resume, **faceted filters, inline quick-retry, bulk actions, metrics charts**.
   Deferred to v1.1: flows/parent-child tree, job schedulers panel, SSE live updates.
2. **BullMQ only** (no legacy Bull, no BullMQ Pro) — but keep the `BaseAdapter` abstraction so
   a Bull adapter can drop in later.
3. **Keep bull-board's `IServerAdapter` pattern + a `createBoard(...)` bootstrap**, but define
   **our own REST route table** (we add filters/metrics/bulk that bull-board lacks). Not a
   drop-in import swap for bull-board.
4. **MIT**, with attribution to bull-board (already in LICENSE + README).
5. **Name:** `bullwatch`, npm scope `@bullwatch/*`.

---

## Reference repos (READ these for the port — "the best reference is source code")

- **`/Users/mike/Code/bull-board`** — architecture to fork. Key files:
  - `packages/api/typings/app.d.ts` — `IServerAdapter`, `AppControllerRoute`, `AppQueue`,
    `AppJob`, `QueueJob`, `UIConfig` DTOs. **Port these types** (restructured, see conventions).
  - `packages/api/typings/responses.d.ts` — response DTOs.
  - `packages/api/src/routes.ts` — the declarative route table.
  - `packages/api/src/handlers/*` — one handler per route.
  - `packages/api/src/queueAdapters/{base.ts,bullMQ.ts}` — the queue adapter.
  - `packages/api/src/index.ts` — `createBullBoard()` bootstrap (UI path resolution via
    `require.resolve('@bull-board/ui/package.json')`).
  - `packages/express/src/ExpressAdapter.ts`, `packages/hono/src/HonoAdapter.ts` — adapter refs.
  - `packages/test-utils/src/*` — **the contract-test battery** (`runServerAdapterContract`,
    `redisFixtures`, `uiFixture`). PORT THIS — it's how one suite tests all 9 adapters.
  - `packages/api/tests/api/*.spec.ts` — 18 real-Redis handler tests. PORT THESE.
  - `.github/workflows/{nodejs.yml,release.yml}` — CI + publish. MIRROR THESE.
- **`/Users/mike/Code/trigger.dev`** (apps/webapp) — UI/UX patterns to imitate (NOT the dark
  theme). Study: `app/components/primitives/{Table,Buttons,Badge,Select,AppliedFilter}.tsx`,
  `app/components/runs/v3/{TaskRunStatus,RunFilters}.tsx`. Filter state lives in URL params.
  Port the *interaction patterns* (faceted filters, status combos, table variants), re-skinned
  light. Their tests use vitest — adopt their component test patterns.
- **`/Users/mike/Code/dub`** — the **visual target** (light theme, charts, dashboard layout).
  `packages/ui` (primitives + `@dub/ui/charts`), `packages/tailwind-config`, `apps/web`
  analytics pages. **A dedicated dub UI study is being run; its findings get appended to the
  "UI / light theme spec" section below — if that section is still a placeholder, re-run a
  study of dub's charts + tailwind-config + a dashboard page before building the UI.**
- **`/Users/mike/Code/bullmq`** — the library. Surface a dashboard uses:
  - `Queue`/`QueueGetters`: `getJob`, `getJobs(types,start,end,asc)`, `getJobCounts(...types)`,
    `getJobState`, `getJobLogs`, `getMetrics('completed'|'failed',start,end)`, `getWorkers`,
    `count`, `getDependencies`, per-state getters.
  - `Queue` management: `add`, `pause`, `resume`, `isPaused`, `clean(grace,limit,type)`,
    `drain`, `obliterate`, `remove(jobId)`, `retryJobs`, `promoteJobs`.
  - `Job`: fields `id,name,data,opts,progress,returnvalue,stacktrace,timestamp,processedOn,
    finishedOn,attemptsMade,failedReason,delay,priority,parent`. Actions: `retry(state)`,
    `remove`, `promote`, `changeDelay`, `updateData`, `log`, `getState`.
  - Job states: `waiting, active, completed, failed, delayed, prioritized, waiting-children,
    paused`. Defined in `src/types/{job-type,finished-status}.ts`.
  - v1.1: `FlowProducer.getFlow` (parent/child tree), `getJobSchedulers`, `QueueEvents` (live).

---

## Owner's code conventions (apply to ALL new code)

Full rules in `/Users/mike/.claude/CLAUDE.md`. The load-bearing ones for this build:
- **One exported function per file; filename = function name in kebab-case**
  (`get-queue-jobs.ts` → `getQueueJobs`). Extra functions in a file are unexported local helpers.
  Exported/public function first, private helpers below.
- **Repetition over abstraction.** No grab-bag `utils.ts`/`shared.ts`. No DB/query abstraction
  layers. Repeat composition per call site. A helper with one caller lives at that call site.
- **Types terminate at boundaries** (routes = Zod-validated req/resp; the queue-adapter edge).
  Infer elsewhere. `import type` for type-only. Strict TS, no `as` at boundaries.
- **Naming:** plain verbs — `getQueues`, `retryJob`, `listJobs`, `cleanQueue`, `pauseQueue`.
  `find*` returns null on miss, `get*` always succeeds, `guard*` throws. Booleans `is`/`has`.
  Restate domain nouns (`queueName` not `name` at call sites where ambiguous).
- **Control flow:** early returns, curly braces always, no inline `if () return`, no nested
  ternaries, functions under ~25 lines, named intermediate consts.
- **Comments:** default to zero. Only a non-obvious *why* earns one line.
- **API:** field names **snake_case** in request/response bodies. RESTful nested routes, id in
  path. POST returns the created object; 204 for void. Batch mutations all-or-nothing.
- **React:** derive state don't sync; `function X(props: XProps)` + `const {…} = props` first
  line; one component per file in the feature's `_components/`; `cn()` object form for
  conditional classes; no premature `useMemo`.
- Note bull-board uses classes + big files + camelCase filenames. When porting, **restructure to
  the above** (kebab-case files, smaller functions) where it doesn't fight the adapter contract.
  The `IServerAdapter`/`BaseAdapter` shape stays (it's the public API); the handlers and helpers
  get the one-function-per-file treatment.

## Commit rules (IMPORTANT)
- **Atomic, conventional, lowercase, imperative** (`feat:`/`fix:`/`chore:`/`test:`). One logical
  change per commit. Body states the *why* (name the principle), not a diff restatement.
- **Commit as Mike Wu** using his configured git `user.name`/`user.email`. **NEVER** attribute to
  Claude/AI, no `Co-Authored-By: Claude`, no "Generated with" lines, no identity overrides.
- **Never push** automatically.

---

## Stack (decided)
- **pnpm** workspaces + **Turborepo**. Node >=20. `packageManager: pnpm@10.30.3`.
- **tsup** builds every library package → dual **ESM + CJS + .d.ts** (Express consumers are CJS,
  Hono/others ESM — dual output is required). Config per package: `tsup.config.ts`.
- **Vite** builds the React UI (`@bullwatch/react`) → static assets in `dist/` incl. an
  `index.html`/`index.ejs` template with an injected `<base href>` + serialized UI config.
  **The SPA MUST be base-path agnostic** (mounts at arbitrary paths like `/admin/queues`) —
  use relative asset URLs + a runtime-injected `basePath`, exactly like bull-board's entry.
- **Biome** for lint + format (already configured, `biome.json`).
- **Vitest** for all tests (node env for api/adapters against real Redis; jsdom for UI).
- **release-it** + `@release-it-plugins/workspaces` bumps all packages in lockstep + tags
  `v${version}`; a **tag-triggered GitHub Action** runs `npm publish --provenance --access
  public` per package (guard `"private": true` packages — bull-board's loop doesn't).
- `bullmq` is a **peerDependency** in `@bullwatch/api` (and thus everywhere) — NEVER a direct
  dep. This is what preserves version-correct mutations. Framework deps (express, fastify, …)
  are peerDeps in their adapter packages.

---

## Package layout (target)
```
packages/
  api/           @bullwatch/api      core: types, queue adapter, route table, handlers, createBoard
  react/         @bullwatch/react    the SPA (Vite). Ships dist/ ; resolved at runtime by adapters
  test-utils/    @bullwatch/test-utils  (private) contract battery + redis fixtures + ui fixture
  express/       @bullwatch/express
  fastify/       @bullwatch/fastify
  hono/          @bullwatch/hono
  koa/           @bullwatch/koa
  h3/            @bullwatch/h3
  hapi/          @bullwatch/hapi
  elysia/        @bullwatch/elysia
  bun/           @bullwatch/bun
  nestjs/        @bullwatch/nestjs
tooling/
  tsconfig/      @bullwatch/tsconfig  (done)
```
Each publishable package.json: `main`/`module`/`types`/`exports` (dual), `files: ["dist"]`,
`publishConfig.access: public`, `peerDependencies` as above, version pinned in lockstep, sibling
`@bullwatch/*` deps referenced `workspace:*` in-repo.

---

## The v1 REST route table (our own — snake_case bodies, `/api` prefix)
Entry (HTML): `GET /`, `GET /queue/:queueName`, `GET /queue/:queueName/:jobId`.
Read:
- `GET /api/queues?active_queue=&status=&page=&per_page=&sort=&search=` — main poll endpoint;
  returns `{ queues: AppQueue[] }` with counts, paginated+filtered jobs, statuses, is_paused.
- `GET /api/queues/:queueName/:jobId` → `{ job, status }`
- `GET /api/queues/:queueName/:jobId/logs`
- `GET /api/queues/:queueName/metrics?type=completed|failed` → throughput buckets for charts
Queue actions (PUT): `/:queueName/pause`, `/resume`, `/empty`, `/clean/:status`,
  `/retry/:status` (bulk retry a status), `/promote` (promote all delayed).
Job actions: `PUT /:queueName/:jobId/{retry,promote,clean}`, `PATCH /:queueName/:jobId/update-data`,
  `POST /:queueName/add`.
Bulk: `POST /api/queues/:queueName/jobs/bulk` body `{ action, job_ids }` (all-or-nothing).
Filters map to `Queue.getJobs(statuses, start, end)` + client/server search on job name/id.

---

## Testing plan (port comprehensively — owner asked for "all the tests")
1. **Contract battery** (`@bullwatch/test-utils`): port bull-board's `runServerAdapterContract` +
   `redisFixtures` (unique queue names `${prefix}-${pid}-${counter}`, obliterate on teardown) +
   `uiFixture` (minimal `dist/index.ejs`+`dist/static` stand-in so adapters test without a UI
   build). Each adapter package has `tests/contract.spec.ts` calling it. Assert: entry HTML with
   injected basePath+config, static assets, `GET /api/queues`, `POST add`, `PUT pause`, 404 shape
   — both mounted at root AND under a `/ui` basePath.
2. **API handler tests** (`packages/api/tests/`): port all 18 bull-board `tests/api/*.spec.ts`
   against real Redis (retry-job, job-handlers, pause-resume, metrics, clean, promote, add,
   update-data, filters, bulk, redis-stats). Create queue → obliterate in before/after → mount via
   `createBoard` + a supertest-driven adapter → assert live queue state.
3. **UI tests** (`packages/react/`): vitest + jsdom + @testing-library. Test the query hooks
   (polling, filter→query-param sync), status-pill rendering per state, table row actions,
   filter bar. Adopt trigger.dev's component-test patterns.
4. **CI** runs all of it with a Redis service container across Node 20/22/24; a separate bun job
   for `@bullwatch/bun`; a UI job (no Redis).

---

## UI / light theme spec (from dub study)
> **PLACEHOLDER — being filled by the dub study agent.** If this still says PLACEHOLDER when you
> reach the UI, run an Explore agent over `/Users/mike/Code/dub` for: `@dub/ui/charts` config
> (chart lib, colors, gradients, axes, tooltips), `packages/tailwind-config` (light palette,
> gray scale, radius, shadows, font), a representative analytics dashboard page (layout shell,
> card styling), and the data-table pattern (@tanstack/react-table? row actions, pagination).
> Then: light theme, white/neutral surfaces, subtle borders + soft shadows, dub's chart aesthetic
> for the completed/failed throughput charts, status pills color-coded per job state.

---

## Current status (update as you go)
- [x] Monorepo foundation: root package.json, pnpm-workspace, turbo.json, biome, gitignore,
      LICENSE (MIT+attribution), README, `@bullwatch/tsconfig` presets. **Committed** `29bc21b`.
- [ ] `@bullwatch/api`: types (port app.d.ts/responses.d.ts, restructured), `BaseAdapter` +
      `BullMQAdapter`, route table, one handler per file, `createBoard` bootstrap, `formatJob`
      normalizer. tsup + package.json (bullmq peerDep).
- [ ] `@bullwatch/react`: Vite SPA scaffold, base-path-agnostic entry, query client + API client,
      queue list, job list + detail, status pills, filters, metrics charts (dub-styled). Light theme.
- [ ] `@bullwatch/test-utils`: redis fixtures + contract battery + ui fixture.
- [ ] `@bullwatch/express` (first adapter) + `tests/contract.spec.ts`.
- [ ] Port all api handler tests (`packages/api/tests/`).
- [ ] Remaining adapters: fastify, hono, koa, h3, hapi, elysia, bun, nestjs (+ contract test each).
      These are mechanical — copy the bull-board adapter, adapt to our route registration.
- [ ] CI workflows: `.github/workflows/{ci.yml,release.yml}` (Redis service, node matrix, bun job,
      UI job, tag-triggered publish with private-package guard).
- [ ] `pnpm install && pnpm build && pnpm typecheck && pnpm test` all green.
- [ ] Verify end-to-end: mount the express adapter on a scratch app against local Redis, load the
      UI, confirm queue list + job actions work (use the `/verify` skill / drive it in a browser).

## Suggested build order for the continuation
api core → test-utils → express + its contract test → port api handler tests → get that slice
green (`pnpm test` with local Redis) → UI (dub-styled) → remaining 8 adapters (parallelize with
subagents; they're mechanical) → CI → full green + e2e verify. Commit atomically at each step.
