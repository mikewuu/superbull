import { authTables } from '@convex-dev/auth/server';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const memberRole = v.union(v.literal('owner'), v.literal('admin'), v.literal('member'));

export default defineSchema({
  ...authTables,

  projects: defineTable({
    name: v.string(),
    slug: v.string(),
    createdAt: v.number(),
  }).index('by_slug', ['slug']),

  apiKeys: defineTable({
    userId: v.id('users'),
    name: v.string(),
    keyHash: v.string(),
    keyPrefix: v.string(),
    lastUsedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index('by_key_hash', ['keyHash'])
    .index('by_user', ['userId']),

  oauthClients: defineTable({
    clientId: v.string(),
    name: v.string(),
    redirectUris: v.array(v.string()),
  }).index('by_client_id', ['clientId']),

  oauthAuthCodes: defineTable({
    codeHash: v.string(),
    clientId: v.string(),
    userId: v.id('users'),
    projectId: v.id('projects'),
    redirectUri: v.string(),
    codeChallenge: v.string(),
    scopes: v.array(v.string()),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
  })
    .index('by_code_hash', ['codeHash'])
    .index('by_user', ['userId'])
    .index('by_project', ['projectId']),

  oauthTokens: defineTable({
    accessTokenHash: v.string(),
    refreshTokenHash: v.string(),
    userId: v.id('users'),
    projectId: v.id('projects'),
    clientId: v.string(),
    scopes: v.array(v.string()),
    expiresAt: v.number(),
    refreshExpiresAt: v.number(),
    revokedAt: v.optional(v.number()),
  })
    .index('by_access_token_hash', ['accessTokenHash'])
    .index('by_refresh_token_hash', ['refreshTokenHash'])
    .index('by_user', ['userId'])
    .index('by_project', ['projectId']),

  members: defineTable({
    projectId: v.id('projects'),
    userId: v.id('users'),
    role: memberRole,
  })
    .index('by_user', ['userId'])
    .index('by_project', ['projectId'])
    .index('by_project_user', ['projectId', 'userId']),

  invites: defineTable({
    projectId: v.id('projects'),
    email: v.string(),
    role: memberRole,
    tokenHash: v.string(),
    invitedBy: v.id('users'),
    expiresAt: v.number(),
    acceptedAt: v.optional(v.number()),
  })
    .index('by_project', ['projectId'])
    .index('by_token_hash', ['tokenHash'])
    .index('by_email', ['email']),

  // Replaces proxySources. `tokenHash` is the enrollment-token flow (sha256
  // of a one-time plaintext token minted by the Next server action and never
  // stored) — connectors carry no URL and no plaintext credential; the only
  // transport is the outbound WS session they hold open to apps/gateway.
  connectors: defineTable({
    projectId: v.id('projects'),
    name: v.string(),
    tokenHash: v.optional(v.string()),
    version: v.optional(v.string()),
    queues: v.optional(v.array(v.string())),
    lastConnectedAt: v.optional(v.number()),
    lastDisconnectedAt: v.optional(v.number()),
  })
    .index('by_project', ['projectId'])
    .index('by_token_hash', ['tokenHash'])
    .index('by_project_name', ['projectId', 'name']),

  ingestEvents: defineTable({
    projectId: v.id('projects'),
    connectorId: v.id('connectors'),
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
    // Dedupe is scoped per connector: uuids are minted by the connector as
    // `${queueName}:${streamEventId}`, so two tenants monitoring same-named
    // queues can legitimately produce identical uuids.
    .index('by_connector_uuid', ['connectorId', 'uuid'])
    .index('by_connector_ts', ['connectorId', 'ts'])
    .index('by_connector_queue_ts', ['connectorId', 'queueName', 'ts'])
    .index('by_project_ts', ['projectId', 'ts']),

  errorGroups: defineTable({
    projectId: v.id('projects'),
    connectorId: v.id('connectors'),
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
    .index('by_connector_fingerprint', ['connectorId', 'fingerprint'])
    .index('by_connector_last_seen', ['connectorId', 'lastSeenTs'])
    .index('by_connector_state', ['connectorId', 'state'])
    .index('by_project_last_seen', ['projectId', 'lastSeenTs']),

  deployAnnotations: defineTable({
    projectId: v.id('projects'),
    connectorId: v.id('connectors'),
    label: v.string(),
    ts: v.number(),
  }).index('by_connector_ts', ['connectorId', 'ts']),

  alertRules: defineTable({
    projectId: v.id('projects'),
    // undefined connectorId = every connector in this rule's project.
    connectorId: v.optional(v.id('connectors')),
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
  })
    .index('by_enabled', ['isEnabled'])
    .index('by_project', ['projectId']),

  alertStates: defineTable({
    ruleId: v.id('alertRules'),
    state: v.union(v.literal('firing'), v.literal('resolved')),
    lastFiredTs: v.optional(v.number()),
    lastNotifiedTs: v.optional(v.number()),
  }).index('by_rule', ['ruleId']),

  savedDashboards: defineTable({
    projectId: v.id('projects'),
    name: v.string(),
    cards: v.array(v.any()),
  }).index('by_project', ['projectId']),

  statusPageConfigs: defineTable({
    projectId: v.id('projects'),
    connectorId: v.id('connectors'),
    slug: v.string(),
    isEnabled: v.boolean(),
    title: v.string(),
    logoStorageId: v.optional(v.id('_storage')),
    queueNames: v.optional(v.array(v.string())),
  })
    .index('by_slug', ['slug'])
    .index('by_connector', ['connectorId'])
    .index('by_project', ['projectId']),
});
