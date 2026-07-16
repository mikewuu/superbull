import { z } from 'zod';

/**
 * Wire protocol between a @superbull/connector process and the SuperBull
 * gateway. All frames are JSON text WebSocket messages. The connector dials
 * out; the gateway never connects in.
 *
 * Lifecycle:
 *   1. Connector opens the socket and sends `hello` with its enrollment token.
 *   2. Gateway verifies the token hash and replies `hello_ack`, or
 *      `hello_error` and closes. On `code: 'unauthorized'` the connector must
 *      NOT reconnect.
 *   3. Gateway sends `request` frames (RPC mirroring the @superbull/api REST
 *      surface); connector replies `response` with the same `id`.
 *   4. Connector sends `events` batches; gateway replies `events_ack`. The
 *      connector advances its per-queue QueueEvents cursor only after the ack.
 *   5. Keepalive is WebSocket-level ping/pong initiated by the gateway every
 *      HEARTBEAT_INTERVAL_MS. A connector that sees no ping for
 *      CONNECTOR_PING_TIMEOUT_MS terminates and reconnects with jittered
 *      exponential backoff.
 *
 * Live mutations are never queued or replayed: if the socket is down, RPC
 * fails fast with "connector disconnected" and the user decides to retry.
 */

export const HEARTBEAT_INTERVAL_MS = 15_000;
export const CONNECTOR_PING_TIMEOUT_MS = 45_000;
export const RPC_TIMEOUT_MS = 10_000;
export const MAX_EVENTS_PER_BATCH = 500;

// ---------------------------------------------------------------------------
// Ingest events (mirrors the historical /api/ingest shape, snake_case)
// ---------------------------------------------------------------------------

export const ingestEventSchema = z.object({
  uuid: z.string(),
  type: z.string(),
  queue_name: z.string(),
  ts: z.number(),
  job_name: z.string().optional(),
  job_id: z.union([z.string(), z.number()]).optional(),
  duration_ms: z.number().nullable().optional(),
  wait_ms: z.number().nullable().optional(),
  failed_reason: z.string().optional(),
  counts: z.record(z.string(), z.unknown()).optional(),
  worker_count: z.number().optional(),
  oldest_waiting_ms: z.number().nullable().optional(),
});

export type IngestEvent = z.infer<typeof ingestEventSchema>;

// ---------------------------------------------------------------------------
// Connector -> gateway frames
// ---------------------------------------------------------------------------

export const helloFrameSchema = z.object({
  type: z.literal('hello'),
  token: z.string().min(1),
  name: z.string().min(1),
  version: z.string(),
  queues: z.array(z.string()),
  capabilities: z.array(z.string()),
});

export const responseFrameSchema = z.object({
  type: z.literal('response'),
  id: z.string(),
  status: z.number(),
  body: z.string(),
  content_type: z.string().nullable(),
});

export const eventsFrameSchema = z.object({
  type: z.literal('events'),
  batch_id: z.string(),
  events: z.array(ingestEventSchema).max(MAX_EVENTS_PER_BATCH),
});

export const connectorFrameSchema = z.discriminatedUnion('type', [
  helloFrameSchema,
  responseFrameSchema,
  eventsFrameSchema,
]);

export type HelloFrame = z.infer<typeof helloFrameSchema>;
export type ResponseFrame = z.infer<typeof responseFrameSchema>;
export type EventsFrame = z.infer<typeof eventsFrameSchema>;
export type ConnectorFrame = z.infer<typeof connectorFrameSchema>;

// ---------------------------------------------------------------------------
// Gateway -> connector frames
// ---------------------------------------------------------------------------

export const helloAckFrameSchema = z.object({
  type: z.literal('hello_ack'),
  connector_id: z.string(),
  heartbeat_interval_ms: z.number(),
});

export const helloErrorFrameSchema = z.object({
  type: z.literal('hello_error'),
  code: z.enum(['unauthorized', 'protocol_error', 'internal_error']),
  message: z.string(),
});

export const requestFrameSchema = z.object({
  type: z.literal('request'),
  id: z.string(),
  method: z.string(),
  path: z.array(z.string()),
  search: z.string(),
  body: z.string().nullable(),
  content_type: z.string().nullable(),
});

export const eventsAckFrameSchema = z.object({
  type: z.literal('events_ack'),
  batch_id: z.string(),
});

export const gatewayFrameSchema = z.discriminatedUnion('type', [
  helloAckFrameSchema,
  helloErrorFrameSchema,
  requestFrameSchema,
  eventsAckFrameSchema,
]);

export type HelloAckFrame = z.infer<typeof helloAckFrameSchema>;
export type HelloErrorFrame = z.infer<typeof helloErrorFrameSchema>;
export type RequestFrame = z.infer<typeof requestFrameSchema>;
export type EventsAckFrame = z.infer<typeof eventsAckFrameSchema>;
export type GatewayFrame = z.infer<typeof gatewayFrameSchema>;

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

export function parseConnectorFrame(raw: string): ConnectorFrame | null {
  return parseFrame(connectorFrameSchema, raw);
}

export function parseGatewayFrame(raw: string): GatewayFrame | null {
  return parseFrame(gatewayFrameSchema, raw);
}

function parseFrame<T>(schema: z.ZodType<T>, raw: string): T | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = schema.safeParse(json);
  return result.success ? result.data : null;
}

// ---------------------------------------------------------------------------
// Gateway internal HTTP API (web app -> gateway), bearer-authenticated with
// GATEWAY_INTERNAL_TOKEN. Documented here so both sides share one contract.
// ---------------------------------------------------------------------------

export const rpcRequestSchema = z.object({
  connector_id: z.string(),
  method: z.string(),
  path: z.array(z.string()),
  search: z.string(),
  body: z.string().nullable(),
  content_type: z.string().nullable(),
});

export const rpcResponseSchema = z.object({
  status: z.number(),
  body: z.string(),
  content_type: z.string().nullable(),
});

export const connectorStatusSchema = z.object({
  connected: z.boolean(),
  connected_at: z.number().nullable(),
  name: z.string().nullable(),
  version: z.string().nullable(),
  queues: z.array(z.string()),
});

export type RpcRequest = z.infer<typeof rpcRequestSchema>;
export type RpcResponse = z.infer<typeof rpcResponseSchema>;
export type ConnectorStatus = z.infer<typeof connectorStatusSchema>;
