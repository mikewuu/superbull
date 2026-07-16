# superbull: Agent Handoff

The hosted-SaaS rewrite described in [`REWRITE_PLAN.md`](./REWRITE_PLAN.md) has landed:
`apps/hub` is gone, `apps/web` is the multi-tenant hosted app (workspaces, Google sign-in
via `@convex-dev/auth`, per-connector dashboards at
`/app/[workspaceSlug]/connectors/[connectorId]`), `@superbull/connector` is the
outbound-only WebSocket agent, `apps/gateway` terminates connector WebSockets at
`connect.superbull.com`, Convex is the datastore, and alert evaluation/digests run as
Convex crons. See the [README](./README.md) for the current architecture and
`packages/protocol` for the wire contract.

Known transitional state (REWRITE_PLAN "Round 3" leftovers, current as of 2026-07-17):

- `packages/proxy` (`superbull-proxy`, the older inbound-HTTP agent) still exists and is
  still what the web app's live-dashboard forwarding path speaks to.
- Web-app → connector actions go through `apps/web/src/lib/forwarding/forward-to-proxy.ts`
  (direct HTTP to a connector-registered URL), not the gateway's `POST /internal/rpc`.
  `GATEWAY_URL`/`GATEWAY_INTERNAL_TOKEN` are not referenced by `apps/web` code yet.
- The legacy hub-token REST surface (`/api/sources*`, `/api/ingest`, `/api/annotations`)
  remains, still using `source_id` naming and the global `SUPERBULL_API_TOKEN`;
  per-workspace API keys are planned to replace it.

Treat those as known state, not as a plan to execute; check git history and
`REWRITE_PLAN.md` before assuming anything here is still current.
