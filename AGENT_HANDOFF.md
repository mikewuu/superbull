# superbull: Agent Handoff

The hosted-SaaS rewrite described in [`REWRITE_PLAN.md`](./REWRITE_PLAN.md) has landed:
`apps/hub` is gone, `apps/web` is the multi-project hosted app (projects, Google sign-in
via `@convex-dev/auth`, per-connector dashboards at
`/app/[projectSlug]/connectors/[connectorId]`), `@superbull/connector` is the
outbound-only WebSocket agent, `apps/gateway` terminates connector WebSockets at
`connect.superbull.com`, Convex is the datastore, and alert evaluation/digests run as
BullMQ jobs. See the [README](./README.md) for the current architecture and
`packages/protocol` for the wire contract.

REWRITE_PLAN "Round 3" has landed too: `packages/proxy` (the older inbound-HTTP agent) is
deleted, and every web-app → connector call (the per-connector dashboard and the MCP
tools) goes through the gateway's `POST /internal/rpc` via
`apps/web/src/lib/gateway/call-gateway-rpc.ts` (addressed with
`GATEWAY_URL`/`GATEWAY_INTERNAL_TOKEN`). MCP tool creation of connectors is gone
(`add_connector` was removed); connectors are created in the web UI.

Current API authentication:

- `/api/annotations` and `/api/mcp` accept named per-user `sbh_` API keys and
  project-bound `sbho_` OAuth access tokens. Personal keys can access connectors across
  the caller's projects; OAuth access remains pinned to the project selected at consent.

`REWRITE_PLAN.md` is historical. Use this file, the README, and current code for shipped
behavior.
