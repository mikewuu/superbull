# @superbull/connector

The outbound agent for [SuperBull](https://superbull.com)'s hosted mode. Run it next to your BullMQ workers: it opens one outbound WebSocket to the SuperBull gateway, serves the full queue API over that socket (RPC), and streams job events. No inbound port, no public URL, nothing to expose.

## Run

```bash
npx @superbull/connector --url wss://connect.superbull.com --token <one-time-token>
```

The bin is `superbull-connector`. Get the one-time token by creating a connector in your workspace (Connectors, then New connector); it is shown exactly once and the workspace stores only a hash of it.

## Flags and environment variables

| Flag | Env var | Default |
| --- | --- | --- |
| `-u, --url` | `SUPERBULL_URL` | required |
| `-t, --token` | `SUPERBULL_TOKEN` | required |
| `-n, --name` | `SUPERBULL_NAME` | `os.hostname()` |
| `--queues a,b,c` | `SUPERBULL_QUEUES` | auto-discovered via Redis `SCAN` |
| `--prefix` | `SUPERBULL_PREFIX` | `bull` |
| `-h, --redis-host` | `REDIS_HOST` | `127.0.0.1` |
| `-p, --redis-port` | `REDIS_PORT` | `6379` |
| `--redis-password` | `REDIS_PASSWORD` | none |
| `--redis-db` | `REDIS_DB` | none |
| `--redis-tls` | `REDIS_TLS=true` | off |
| `--help` | | print usage |

Unknown flags are an error. `bullmq` (`^5.0.0`) is a peer dependency.

## Behavior

- **Events, not polling.** One blocking BullMQ `QueueEvents` consumer per queue emits `job.completed` / `job.failed` (enriched with job name, duration, and wait time where available), plus a `queue.snapshot` every 60s with counts, worker count, and oldest waiting job age.
- **At-least-once delivery.** Event batches count as sent only after the gateway acknowledges them; the workspace dedupes by event `uuid`. Unacked batches are resent after reconnect. The buffer caps at 5000 events, then drops oldest first with a warning.
- **Reconnects.** Jittered exponential backoff, base 1s, capped at 60s. The gateway pings over the socket; 45s without a ping and the connector terminates the connection and redials.
- **Auth failure is terminal.** On an unauthorized handshake the connector exits without reconnecting (the token was deleted or already replaced by another connector).
- **Fail-fast RPC.** While disconnected, dashboard and MCP actions against this connector fail immediately with "connector disconnected" rather than queueing.

The wire format is [@superbull/protocol](https://www.npmjs.com/package/@superbull/protocol). For running the dashboard fully self-hosted with no connector at all, see the server adapters ([@superbull/express](https://www.npmjs.com/package/@superbull/express) and friends).

Full docs: [superbull.com/docs/connector](https://superbull.com/docs/connector). Part of the [superbull monorepo](https://github.com/mikewuu/superbull). MIT.
