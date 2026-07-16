# @superbull/protocol

The typed WebSocket frame contract shared by the [SuperBull](https://superbull.com) gateway (`apps/gateway`) and [@superbull/connector](https://www.npmjs.com/package/@superbull/connector). Zod schemas, inferred types, parse helpers, and protocol constants. Audience: contributors to the two ends of the wire; app code should not need this package.

Frames are JSON text over a single WebSocket the connector dials out. There is no explicit protocol version field; frames are validated with a discriminated union on `type`, and unknown or invalid frames parse to `null` and are ignored. The connector's semantic `version` string rides in `hello`.

## Connector to gateway

| Frame | Fields | Notes |
| --- | --- | --- |
| `hello` | `token`, `name`, `version`, `queues[]`, `capabilities[]` | First frame after the socket opens |
| `response` | `id`, `status`, `body`, `content_type` | RPC reply, echoing the `request` id |
| `events` | `batch_id`, `events[]` | Ingest batch, max 500 events |

## Gateway to connector

| Frame | Fields | Notes |
| --- | --- | --- |
| `hello_ack` | `connector_id`, `heartbeat_interval_ms` | Handshake accepted |
| `hello_error` | `code`, `message` | `code` is `unauthorized` \| `protocol_error` \| `internal_error`; on `unauthorized` the connector must not reconnect |
| `request` | `id`, `method`, `path[]`, `search`, `body`, `content_type` | RPC into the connector's in-process queue API |
| `events_ack` | `batch_id` | The connector advances its cursor only after this |

Lifecycle: `hello`, then `hello_ack` or `hello_error`, then interleaved `request`/`response` and `events`/`events_ack`. Keepalive is WS-level ping/pong initiated by the gateway. Live mutations are never queued; RPC against a disconnected connector fails fast.

## Constants

| Constant | Value |
| --- | --- |
| `HEARTBEAT_INTERVAL_MS` | 15000 |
| `CONNECTOR_PING_TIMEOUT_MS` | 45000 |
| `RPC_TIMEOUT_MS` | 10000 |
| `MAX_EVENTS_PER_BATCH` | 500 |

## Exports

- `parseConnectorFrame(raw)` / `parseGatewayFrame(raw)`: parse one side's frames, `null` on failure.
- Per-frame schemas (`helloFrameSchema`, `requestFrameSchema`, ...) and the `connectorFrameSchema` / `gatewayFrameSchema` unions, with inferred types (`HelloFrame`, `GatewayFrame`, ...).
- `ingestEventSchema` / `IngestEvent`: snake_case event shape (`uuid`, `type`, `queue_name`, `ts`, plus optional `job_name`, `job_id`, `duration_ms`, `wait_ms`, `failed_reason`, `counts`, `worker_count`, `oldest_waiting_ms`).
- `rpcRequestSchema`, `rpcResponseSchema`, `connectorStatusSchema`: the gateway's internal HTTP API contract, used by the hosted web app.

Part of the [superbull monorepo](https://github.com/mikewuu/superbull). MIT.
