# @superbull/web

Private workspace app (not published). The hosted [SuperBull](https://superbull.com) product: a Next.js app on Vercel serving the marketing site, the docs, the workspace product under `/app/[workspaceSlug]/...`, public status pages under `/status/[slug]`, the management REST API, and the MCP endpoint at `/api/mcp`. All state (workspaces, members, connectors, ingested events, alert rules, dashboards, status pages) lives in Convex, which also runs the alert-evaluation and daily-digest crons.

Sign-in is Google via `@convex-dev/auth`; a personal workspace is created on first sign-in. Events arrive from connectors through the gateway (`apps/gateway`) into Convex; live queue actions currently use a direct-HTTP forwarding path retained from the legacy proxy (`src/lib/forwarding/forward-to-proxy.ts`), with the migration to the gateway's RPC bridge pending.

## Environment variables

| Var | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | The Convex deployment the app reads and writes against |
| `CONVEX_INTERNAL_TOKEN` | Shared secret for internal Convex calls (also held by the gateway) |
| `SUPERBULL_API_TOKEN` | Bearer token guarding the management REST API and `/api/mcp` |
| `RESEND_API_KEY`, `EMAIL_FROM` | Alert and digest email delivery (set on the Convex deployment) |

## Development

```bash
pnpm --filter @superbull/web dev          # next dev on http://localhost:4700
pnpm --filter @superbull/web convex:dev   # run the Convex backend locally
pnpm --filter @superbull/web test         # vitest
pnpm --filter @superbull/web e2e          # hosted two-hop e2e: convex + gateway + connector fixture (Playwright)
```

Part of the [superbull monorepo](https://github.com/mikewuu/superbull).
