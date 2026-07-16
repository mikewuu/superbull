# superbull: Agent Handoff

The hosted-SaaS rewrite described in [`REWRITE_PLAN.md`](./REWRITE_PLAN.md) has landed:
`apps/hub` is gone, `apps/web` is the multi-tenant hosted app (workspaces, Google sign-in
via `@convex-dev/auth`, per-connector dashboards at
`/app/[workspaceSlug]/connectors/[connectorId]`), `@superbull/connector` is the
outbound-only WebSocket agent, `apps/gateway` terminates connector WebSockets at
`connect.superbull.com`, Convex is the datastore, and alert evaluation/digests run as
Convex crons. See the [README](./README.md) for the current architecture and
`packages/protocol` for the wire contract.

REWRITE_PLAN "Round 3" has landed too: `packages/proxy` (the older inbound-HTTP agent) is
deleted, and every web-app → connector call (the per-connector dashboard and the MCP
tools) goes through the gateway's `POST /internal/rpc` via
`apps/web/src/lib/gateway/call-gateway-rpc.ts` (addressed with
`GATEWAY_URL`/`GATEWAY_INTERNAL_TOKEN`). MCP tool creation of connectors is gone
(`add_connector` was removed); connectors are created in the web UI.

Known transitional state (current as of 2026-07-17):

- The hub-token REST surface is down to `/api/annotations` (plus public `/api/health`),
  still using `source_id` naming and the global `SUPERBULL_API_TOKEN`. The MCP endpoint
  also authenticates with that global token and its connector lookups are
  deployment-wide, not workspace-scoped; per-workspace API keys are planned to replace
  the global token.

Treat that as known state, not as a plan to execute; check git history and
`REWRITE_PLAN.md` before assuming anything here is still current.
