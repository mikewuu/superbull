import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  proxySources: defineTable({
    name: v.string(),
    url: v.string(),
    token: v.string(),
  }).index('by_name', ['name']),

  ingestEvents: defineTable({
    sourceId: v.id('proxySources'),
    uuid: v.string(),
    type: v.string(),
    queueName: v.string(),
    jobName: v.optional(v.string()),
    jobId: v.optional(v.string()),
    ts: v.number(),
    durationMs: v.optional(v.number()),
    waitMs: v.optional(v.number()),
    failedReason: v.optional(v.string()),
    counts: v.optional(v.any()),
    workerCount: v.optional(v.number()),
    oldestWaitingMs: v.optional(v.number()),
  })
    .index('by_uuid', ['uuid'])
    .index('by_source_ts', ['sourceId', 'ts'])
    .index('by_source_queue_ts', ['sourceId', 'queueName', 'ts']),
});
