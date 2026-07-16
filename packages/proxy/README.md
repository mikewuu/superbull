# @superbull/proxy

The legacy headless agent for [SuperBull](https://superbull.com): it listens on an inbound HTTP port, serves the queue REST API behind a bearer token, and can register itself with a hub and push ingest events over HTTP.

**Superseded by [@superbull/connector](https://www.npmjs.com/package/@superbull/connector)** for hosted setups. The connector opens a single outbound WebSocket instead, so it needs no inbound port, no public URL, and no TLS termination of its own. The proxy remains functional; prefer the connector for anything new.

## Run

```bash
npx @superbull/proxy --token <bearer-token>
```

The bin is `superbull-proxy`. It serves the `@superbull/api` routes at `http://<host>:<port>` (default port 4650); clients must send `Authorization: Bearer <token>`.

| Flag | Env var | Default |
| --- | --- | --- |
| `-t, --token` | `SUPERBULL_TOKEN` | required |
| `-n, --name` | `SUPERBULL_NAME` | `os.hostname()` |
| `--port` | `SUPERBULL_PORT` | `4650` |
| `-h, --redis-host` | `REDIS_HOST` | `127.0.0.1` |
| `-p, --redis-port` | `REDIS_PORT` | `6379` |
| `--redis-password` | `REDIS_PASSWORD` | none |
| `--redis-db` | `REDIS_DB` | none |
| `--tls` | `REDIS_TLS=true` | off |
| `--prefix` | `SUPERBULL_PREFIX` | `bull` |
| `--queues a,b,c` | `SUPERBULL_QUEUES` | auto-discovered via Redis `SCAN` |
| `--queues-file <path>` | | newline-separated queue names |
| `--hub <url>` | `SUPERBULL_HUB_URL` | none |
| `--hub-token <token>` | `SUPERBULL_HUB_TOKEN` | none |
| `--advertise-url <url>` | | URL advertised to the hub instead of the local hostname |
| `--no-ingest` | | disable outbound event ingest even when a hub is configured |

When `--hub` is set, the proxy registers itself via `POST <hub>/api/sources/register` (3 retries) and pushes job events to the hub in batches over HTTP.

`bullmq` (`^5.0.0`) is a peer dependency.

Part of the [superbull monorepo](https://github.com/mikewuu/superbull). MIT.
