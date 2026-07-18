/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from 'vitest';
import { api } from '../../convex/_generated/api';
import {
  INTERNAL_TOKEN,
  assertDefined,
  makeTestClient,
  seedConnector,
  seedProject,
} from './test-helpers';

beforeEach(() => {
  process.env.CONVEX_INTERNAL_TOKEN = INTERNAL_TOKEN;
});

// Error groups are created by the ingest path (recordBatch -> upsertErrorGroup
// on job.failed) — record one failure event per call, with a unique uuid so
// ingest's own dedupe never swallows a failure these tests mean to record.
let failureCounter = 0;
async function recordFailure(
  t: ReturnType<typeof makeTestClient>,
  connectorId: Awaited<ReturnType<typeof seedConnector>>,
  overrides: Partial<{
    queueName: string;
    jobName: string;
    jobId: string;
    message: string;
    ts: number;
  }> = {},
) {
  failureCounter += 1;
  return await t.mutation(api.ingest.recordBatch, {
    internalToken: INTERNAL_TOKEN,
    connectorId,
    events: [
      {
        uuid: `errors-test-failure-${failureCounter}`,
        type: 'job.failed',
        queue_name: overrides.queueName ?? 'emails',
        job_name: overrides.jobName,
        job_id: overrides.jobId,
        ts: overrides.ts ?? 1,
        failed_reason: overrides.message ?? 'boom',
      },
    ],
  });
}

describe('errors', () => {
  it('a job.failed event creates a new open error group on first failure', async () => {
    const t = makeTestClient();
    const { projectId, asMember } = await seedProject(t);
    const connectorId = await seedConnector(t, projectId);

    await recordFailure(t, connectorId, { message: 'Failed to send email', ts: 100 });

    const groups = await asMember.query(api.errors.listGroups, { projectId, connectorId });
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      queueName: 'emails',
      message: 'Failed to send email',
      state: 'open',
      count: 1,
      firstSeenTs: 100,
      lastSeenTs: 100,
      isRegression: false,
    });
  });

  it('groups two failures with different digits under the same fingerprint', async () => {
    const t = makeTestClient();
    const { projectId, asMember } = await seedProject(t);
    const connectorId = await seedConnector(t, projectId);

    await recordFailure(t, connectorId, { message: 'Timeout after 123ms', ts: 1 });
    await recordFailure(t, connectorId, { message: 'Timeout after 456789ms', ts: 2 });

    const groups = await asMember.query(api.errors.listGroups, { projectId, connectorId });
    expect(groups).toHaveLength(1);
    expect(assertDefined(groups[0]).count).toBe(2);
  });

  it('groups two failures with different uuids under the same fingerprint', async () => {
    const t = makeTestClient();
    const { projectId, asMember } = await seedProject(t);
    const connectorId = await seedConnector(t, projectId);

    await recordFailure(t, connectorId, {
      message: 'User 550e8400-e29b-41d4-a716-446655440000 not found',
      ts: 1,
    });
    await recordFailure(t, connectorId, {
      message: 'User 6ba7b810-9dad-11d1-80b4-00c04fd430c8 not found',
      ts: 2,
    });

    const groups = await asMember.query(api.errors.listGroups, { projectId, connectorId });
    expect(groups).toHaveLength(1);
    expect(assertDefined(groups[0]).count).toBe(2);
  });

  it('creates a separate group for the same message on a different queue', async () => {
    const t = makeTestClient();
    const { projectId, asMember } = await seedProject(t);
    const connectorId = await seedConnector(t, projectId);

    await recordFailure(t, connectorId, { queueName: 'emails', message: 'boom', ts: 1 });
    await recordFailure(t, connectorId, { queueName: 'webhooks', message: 'boom', ts: 2 });

    const groups = await asMember.query(api.errors.listGroups, { projectId, connectorId });
    expect(groups).toHaveLength(2);
  });

  it('increments count and advances lastSeenTs/lastJobId on repeat failures', async () => {
    const t = makeTestClient();
    const { projectId, asMember } = await seedProject(t);
    const connectorId = await seedConnector(t, projectId);

    await recordFailure(t, connectorId, { jobId: 'job-1', ts: 1 });
    await recordFailure(t, connectorId, { jobId: 'job-2', ts: 2 });
    await recordFailure(t, connectorId, { jobId: 'job-3', ts: 3 });

    const groups = await asMember.query(api.errors.listGroups, { projectId, connectorId });
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      count: 3,
      firstSeenTs: 1,
      lastSeenTs: 3,
      lastJobId: 'job-3',
    });
  });

  it('reopens a resolved group and flags it as a regression on the next failure', async () => {
    const t = makeTestClient();
    const { projectId, asMember } = await seedProject(t);
    const connectorId = await seedConnector(t, projectId);

    await recordFailure(t, connectorId, { ts: 1 });
    const groups = await asMember.query(api.errors.listGroups, { projectId, connectorId });
    await asMember.mutation(api.errors.setGroupState, {
      projectId,
      groupId: assertDefined(groups[0])._id,
      state: 'resolved',
    });

    await recordFailure(t, connectorId, { ts: 2 });

    const reopened = await asMember.query(api.errors.getGroup, {
      projectId,
      groupId: assertDefined(groups[0])._id,
    });
    expect(reopened).toMatchObject({ state: 'open', isRegression: true, count: 2 });
  });

  it('listGroups filters by state using the by_connector_state index', async () => {
    const t = makeTestClient();
    const { projectId, asMember } = await seedProject(t);
    const connectorId = await seedConnector(t, projectId);

    await recordFailure(t, connectorId, { queueName: 'a', ts: 1 });
    await recordFailure(t, connectorId, { queueName: 'b', ts: 2 });
    const groups = await asMember.query(api.errors.listGroups, { projectId, connectorId });
    await asMember.mutation(api.errors.setGroupState, {
      projectId,
      groupId: assertDefined(groups[0])._id,
      state: 'ignored',
    });

    const ignored = await asMember.query(api.errors.listGroups, {
      projectId,
      connectorId,
      state: 'ignored',
    });
    const open = await asMember.query(api.errors.listGroups, {
      projectId,
      connectorId,
      state: 'open',
    });
    expect(ignored).toHaveLength(1);
    expect(open).toHaveLength(1);
  });

  it('getGroup returns null for a group in a different project', async () => {
    const t = makeTestClient();
    const { projectId, asMember } = await seedProject(t);
    const connectorId = await seedConnector(t, projectId);
    await recordFailure(t, connectorId, { ts: 1 });
    const groups = await asMember.query(api.errors.listGroups, { projectId, connectorId });

    const outsider = await seedProject(t);
    const found = await outsider.asMember.query(api.errors.getGroup, {
      projectId: outsider.projectId,
      groupId: assertDefined(groups[0])._id,
    });
    expect(found).toBeNull();
  });

  it('throws for an unauthenticated caller on the user-facing functions', async () => {
    const t = makeTestClient();
    const { projectId } = await seedProject(t);
    const connectorId = await seedConnector(t, projectId);

    await expect(t.query(api.errors.listGroups, { projectId, connectorId })).rejects.toThrow();
  });
});
