import { authTables } from '@convex-dev/auth/server';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  ...authTables,

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

  errorGroups: defineTable({
    sourceId: v.id('proxySources'),
    fingerprint: v.string(),
    queueName: v.string(),
    jobName: v.optional(v.string()),
    message: v.string(),
    state: v.union(v.literal('open'), v.literal('resolved'), v.literal('ignored')),
    count: v.number(),
    firstSeenTs: v.number(),
    lastSeenTs: v.number(),
    lastJobId: v.optional(v.string()),
    isRegression: v.boolean(),
  })
    .index('by_source_fingerprint', ['sourceId', 'fingerprint'])
    .index('by_source_last_seen', ['sourceId', 'lastSeenTs'])
    .index('by_source_state', ['sourceId', 'state']),

  deployAnnotations: defineTable({
    sourceId: v.id('proxySources'),
    label: v.string(),
    ts: v.number(),
  }).index('by_source_ts', ['sourceId', 'ts']),

  alertRules: defineTable({
    sourceId: v.optional(v.id('proxySources')),
    type: v.union(
      v.literal('failed_threshold'),
      v.literal('stuck_queue'),
      v.literal('worker_loss'),
      v.literal('new_error_group'),
    ),
    queueName: v.optional(v.string()),
    threshold: v.optional(v.number()),
    windowMinutes: v.optional(v.number()),
    email: v.string(),
    isEnabled: v.boolean(),
  }).index('by_enabled', ['isEnabled']),

  alertStates: defineTable({
    ruleId: v.id('alertRules'),
    state: v.union(v.literal('firing'), v.literal('resolved')),
    lastFiredTs: v.optional(v.number()),
    lastNotifiedTs: v.optional(v.number()),
  }).index('by_rule', ['ruleId']),

  savedDashboards: defineTable({
    name: v.string(),
    cards: v.array(v.any()),
  }).index('by_name', ['name']),

  statusPageConfigs: defineTable({
    sourceId: v.id('proxySources'),
    slug: v.string(),
    isEnabled: v.boolean(),
    title: v.string(),
    logoStorageId: v.optional(v.id('_storage')),
    queueNames: v.optional(v.array(v.string())),
  })
    .index('by_slug', ['slug'])
    .index('by_source', ['sourceId']),
});
