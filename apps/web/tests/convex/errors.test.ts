/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from 'vitest';
import { api } from '../../convex/_generated/api';
import {
  INTERNAL_TOKEN,
  assertDefined,
  makeTestClient,
  seedConnector,
  seedWorkspace,
} from './test-helpers';

beforeEach(() => {
  process.env.CONVEX_INTERNAL_TOKEN = INTERNAL_TOKEN;
});

async function recordFailure(
  t: ReturnType<typeof makeTestClient>,
  connectorId: string,
  overrides: Partial<{
    queueName: string;
    jobName: string;
    jobId: string;
    message: string;
    ts: number;
  }> = {},
) {
  return await t.mutation(api.errors.recordFailure, {
    internalToken: INTERNAL_TOKEN,
    connectorId,
    queueName: 'emails',
    message: 'boom',
    ts: 1,
    ...overrides,
  });
}

describe('errors', () => {
  it('recordFailure creates a new open error group on first failure', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);

    await recordFailure(t, connectorId, { message: 'Failed to send email', ts: 100 });

    const groups = await asMember.query(api.errors.listGroups, { workspaceId, connectorId });
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
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);

    await recordFailure(t, connectorId, { message: 'Timeout after 123ms', ts: 1 });
    await recordFailure(t, connectorId, { message: 'Timeout after 456789ms', ts: 2 });

    const groups = await asMember.query(api.errors.listGroups, { workspaceId, connectorId });
    expect(groups).toHaveLength(1);
    expect(assertDefined(groups[0]).count).toBe(2);
  });

  it('groups two failures with different uuids under the same fingerprint', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);

    await recordFailure(t, connectorId, {
      message: 'User 550e8400-e29b-41d4-a716-446655440000 not found',
      ts: 1,
    });
    await recordFailure(t, connectorId, {
      message: 'User 6ba7b810-9dad-11d1-80b4-00c04fd430c8 not found',
      ts: 2,
    });

    const groups = await asMember.query(api.errors.listGroups, { workspaceId, connectorId });
    expect(groups).toHaveLength(1);
    expect(assertDefined(groups[0]).count).toBe(2);
  });

  it('creates a separate group for the same message on a different queue', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);

    await recordFailure(t, connectorId, { queueName: 'emails', message: 'boom', ts: 1 });
    await recordFailure(t, connectorId, { queueName: 'webhooks', message: 'boom', ts: 2 });

    const groups = await asMember.query(api.errors.listGroups, { workspaceId, connectorId });
    expect(groups).toHaveLength(2);
  });

  it('increments count and advances lastSeenTs/lastJobId on repeat failures', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);

    await recordFailure(t, connectorId, { jobId: 'job-1', ts: 1 });
    await recordFailure(t, connectorId, { jobId: 'job-2', ts: 2 });
    await recordFailure(t, connectorId, { jobId: 'job-3', ts: 3 });

    const groups = await asMember.query(api.errors.listGroups, { workspaceId, connectorId });
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
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);

    await recordFailure(t, connectorId, { ts: 1 });
    const groups = await asMember.query(api.errors.listGroups, { workspaceId, connectorId });
    await asMember.mutation(api.errors.setGroupState, {
      workspaceId,
      groupId: assertDefined(groups[0])._id,
      state: 'resolved',
    });

    await recordFailure(t, connectorId, { ts: 2 });

    const reopened = await asMember.query(api.errors.getGroup, {
      workspaceId,
      groupId: assertDefined(groups[0])._id,
    });
    expect(reopened).toMatchObject({ state: 'open', isRegression: true, count: 2 });
  });

  it('listGroups filters by state using the by_connector_state index', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);

    await recordFailure(t, connectorId, { queueName: 'a', ts: 1 });
    await recordFailure(t, connectorId, { queueName: 'b', ts: 2 });
    const groups = await asMember.query(api.errors.listGroups, { workspaceId, connectorId });
    await asMember.mutation(api.errors.setGroupState, {
      workspaceId,
      groupId: assertDefined(groups[0])._id,
      state: 'ignored',
    });

    const ignored = await asMember.query(api.errors.listGroups, {
      workspaceId,
      connectorId,
      state: 'ignored',
    });
    const open = await asMember.query(api.errors.listGroups, {
      workspaceId,
      connectorId,
      state: 'open',
    });
    expect(ignored).toHaveLength(1);
    expect(open).toHaveLength(1);
  });

  it('getGroup returns null for a group in a different workspace', async () => {
    const t = makeTestClient();
    const { workspaceId, asMember } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);
    await recordFailure(t, connectorId, { ts: 1 });
    const groups = await asMember.query(api.errors.listGroups, { workspaceId, connectorId });

    const outsider = await seedWorkspace(t);
    const found = await outsider.asMember.query(api.errors.getGroup, {
      workspaceId: outsider.workspaceId,
      groupId: assertDefined(groups[0])._id,
    });
    expect(found).toBeNull();
  });

  it('recordFailure throws for an unknown connector', async () => {
    const t = makeTestClient();

    await expect(recordFailure(t, 'not-a-real-id')).rejects.toThrow(/unknown connector/);
  });

  it('throws with the wrong internal token on recordFailure', async () => {
    const t = makeTestClient();
    const { workspaceId } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);

    await expect(
      t.mutation(api.errors.recordFailure, {
        internalToken: 'wrong-token',
        connectorId,
        queueName: 'emails',
        message: 'boom',
        ts: 1,
      }),
    ).rejects.toThrow();
  });

  it('throws for an unauthenticated caller on the user-facing functions', async () => {
    const t = makeTestClient();
    const { workspaceId } = await seedWorkspace(t);
    const connectorId = await seedConnector(t, workspaceId);

    await expect(t.query(api.errors.listGroups, { workspaceId, connectorId })).rejects.toThrow();
  });
});
