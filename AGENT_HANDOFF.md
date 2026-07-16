# superbull — Agent Handoff

The detailed build plan that used to live in this file (single-tenant `apps/hub` +
`@superbull/proxy`, monorepo scaffolding, testing plan, UI spec, etc.) is stale: that build
shipped, and the project is now mid-way through the hosted-SaaS rewrite described in
[`REWRITE_PLAN.md`](./REWRITE_PLAN.md).

**Read `REWRITE_PLAN.md` first.** It's the single source of truth for the target
architecture, locked decisions, cross-team contracts (WS frame protocol, gateway internal
HTTP API, Convex schema, connector CLI, env vars), and the round-by-round build order. This
file previously contained the pre-rewrite handoff; that content is superseded, not preserved
here — see git history on this file if you need it.

Current state: the `superbull-proxy`/`apps/hub` architecture is being replaced by
`@superbull/connector` (outbound-only WebSocket agent) + `apps/gateway` (WebSocket
termination at `connect.superbull.com`) + a multi-tenant `apps/web` (workspaces, Google
sign-in, per-connector dashboards at `/app/[workspaceSlug]/connectors/[connectorId]`). Check
`REWRITE_PLAN.md`'s "Rounds" section for what's done and what's still in flight.
