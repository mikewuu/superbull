# @superbull/gateway

Private workspace app (not published). The always-on WebSocket service at `connect.superbull.com` that every [@superbull/connector](https://www.npmjs.com/package/@superbull/connector) opens its single outbound connection to. It authenticates connectors, forwards connector events into Convex, and exposes the RPC bridge the hosted web app relays dashboard and MCP requests through.

## Surface

- `GET /connect`: WebSocket upgrade for connectors. The handshake `hello` token is hashed (sha256) and matched against the connector's enrollment token hash in Convex; plaintext tokens are never stored. A reconnect evicts any previous session for the same connector.
- `GET /healthz`: unauthenticated liveness check.
- `POST /internal/rpc`: bearer-authed (gateway internal token) RPC bridge for the web app; forwards a `request` frame to the connector and awaits its `response` (10s timeout; 502 when disconnected, 504 on timeout).
- `GET /internal/connectors/:id/status`: bearer-authed live status (connected, name, version, queues).

Heartbeat is WS ping/pong every 15s; a connector missing pongs for two intervals is terminated. Event batches are written to Convex (`ingest:recordBatch`, deduped by `uuid` per connector) before the gateway acks them. The frame contract is [@superbull/protocol](https://www.npmjs.com/package/@superbull/protocol).

## Environment variables

| Var | Purpose |
| --- | --- |
| `CONVEX_URL` | Convex deployment the gateway calls (required) |
| `CONVEX_INTERNAL_TOKEN` | Shared secret sent with internal Convex calls (required) |
| `GATEWAY_INTERNAL_TOKEN` | Bearer token guarding the `/internal/*` HTTP API (required) |
| `PORT` | Listen port, default `4650` |

## Development

```bash
pnpm --filter @superbull/gateway dev    # tsx watch src/main.ts
pnpm --filter @superbull/gateway test   # vitest
```

Part of the [superbull monorepo](https://github.com/mikewuu/superbull).
