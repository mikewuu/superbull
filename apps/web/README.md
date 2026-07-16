# @superbull/web

Private workspace app (not published). The hosted [SuperBull](https://superbull.com) product: a Next.js app on Vercel serving the marketing site, the docs, the workspace product under `/app/[workspaceSlug]/...`, public status pages under `/status/[slug]`, the management REST API, and the MCP endpoint at `/api/mcp`. All state (workspaces, members, connectors, ingested events, alert rules, dashboards, status pages) lives in Convex, which also runs the alert-evaluation and daily-digest crons.

Sign-in is Google via `@convex-dev/auth`; a personal workspace is created on first sign-in. Events arrive from connectors through the gateway (`apps/gateway`) into Convex; live queue reads and actions (the per-connector dashboard and the MCP tools) are relayed to the connector through the gateway's RPC bridge (`src/lib/gateway/call-gateway-rpc.ts`).

## Environment variables

| Var | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | The Convex deployment the app reads and writes against |
| `CONVEX_INTERNAL_TOKEN` | Shared secret for internal Convex calls (also held by the gateway) |
| `SUPERBULL_API_TOKEN` | Bearer token guarding the management REST API and `/api/mcp` |
| `GATEWAY_URL` | Where this app reaches the gateway's internal RPC API |
| `GATEWAY_INTERNAL_TOKEN` | Bearer token sent on those RPC calls (also held by the gateway) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Alert and digest email delivery (set on the Convex deployment) |

## Development

```bash
pnpm --filter @superbull/web dev          # next dev on http://localhost:4700
pnpm --filter @superbull/web convex:dev   # run the Convex backend locally
pnpm --filter @superbull/web test         # vitest
pnpm --filter @superbull/web e2e          # hosted two-hop e2e: convex + gateway + connector fixture (Playwright)
```

Part of the [superbull monorepo](https://github.com/mikewuu/superbull).
