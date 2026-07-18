# @superbull/web

Private project app (not published). The hosted [SuperBull](https://superbull.com) product: a Next.js app on Vercel serving the marketing site, the docs, the project product under `/app/[projectSlug]/...`, public status pages under `/status/[slug]`, the management REST API, and the MCP endpoint at `/api/mcp`. All state (projects, members, connectors, ingested events, alert rules, dashboards, status pages) lives in Convex. A Redis + BullMQ worker schedules alert evaluation and daily digests.

Sign-in is Google via `@convex-dev/auth`; a personal project is created on first sign-in. Events arrive from connectors through the gateway (`apps/gateway`) into Convex; live queue reads and actions (the per-connector dashboard and the MCP tools) are relayed to the connector through the gateway's RPC bridge (`src/lib/gateway/call-gateway-rpc.ts`).

## Environment variables

| Var | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | The Convex deployment the app reads and writes against |
| `CONVEX_INTERNAL_TOKEN` | Shared secret for internal Convex calls (also held by the gateway) |
| `GATEWAY_URL` | Where this app reaches the gateway's internal RPC API |
| `GATEWAY_INTERNAL_TOKEN` | Bearer token sent on those RPC calls (also held by the gateway) |
| `REDIS_URL` | Redis for per-user rate windows and BullMQ jobs |
| `RESEND_API_KEY`, `EMAIL_FROM` | Alert and digest email delivery (set on the Convex deployment) |

## Development

```bash
pnpm --filter @superbull/web dev          # next dev on http://localhost:4700
pnpm --filter @superbull/web convex:dev   # run the Convex backend locally
pnpm --filter @superbull/web queue:work   # run scheduled alert and digest jobs
pnpm --filter @superbull/web test         # vitest
pnpm --filter @superbull/web e2e          # hosted two-hop e2e: convex + gateway + connector fixture (Playwright)
```

Part of the [superbull monorepo](https://github.com/mikewuu/superbull).
