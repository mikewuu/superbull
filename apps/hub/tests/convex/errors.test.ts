/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { makeFunctionReference } from 'convex/server';
import { beforeEach, describe, expect, it } from 'vitest';
import schema from '../../convex/schema';

const INTERNAL_TOKEN = 'test-internal-token';

const createSourceRef = makeFunctionReference<'mutation'>('proxySources:create');
const recordFailureRef = makeFunctionReference<'mutation'>('errors:recordFailure');
const listGroupsRef = makeFunctionReference<'query'>('errors:listGroups');
const getGroupRef = makeFunctionReference<'query'>('errors:getGroup');
const setGroupStateRef = makeFunctionReference<'mutation'>('errors:setGroupState');

beforeEach(() => {
  process.env.CONVEX_INTERNAL_TOKEN = INTERNAL_TOKEN;
});

function makeTestClient() {
  return convexTest(schema, import.meta.glob('../../convex/**/*.ts'));
}

async function createSource(t: ReturnType<typeof makeTestClient>) {
  return await t.mutation(createSourceRef, {
    internalToken: INTERNAL_TOKEN,
    name: 'proxy-a',
    url: 'https://proxy-a.example.com',
    token: 'secret',
  });
}

async function recordFailure(
  t: ReturnType<typeof makeTestClient>,
  sourceId: string,
  overrides: Partial<{
    queueName: string;
    jobName: string;
    jobId: string;
    message: string;
    ts: number;
  }> = {},
) {
  return await t.mutation(recordFailureRef, {
    internalToken: INTERNAL_TOKEN,
    sourceId,
    queueName: 'emails',
    message: 'boom',
    ts: 1,
    ...overrides,
  });
}

describe('errors', () => {
  it('recordFailure creates a new open error group on first failure', async () => {
    const t = makeTestClient();
    const source = await createSource(t);

    await recordFailure(t, source._id, { message: 'Failed to send email', ts: 100 });

    const groups = await t.query(listGroupsRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
    });
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
    const source = await createSource(t);

    await recordFailure(t, source._id, { message: 'Timeout after 123ms', ts: 1 });
    await recordFailure(t, source._id, { message: 'Timeout after 456789ms', ts: 2 });

    const groups = await t.query(listGroupsRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(2);
  });

  it('groups two failures with different uuids under the same fingerprint', async () => {
    const t = makeTestClient();
    const source = await createSource(t);

    await recordFailure(t, source._id, {
      message: 'User 550e8400-e29b-41d4-a716-446655440000 not found',
      ts: 1,
    });
    await recordFailure(t, source._id, {
      message: 'User 6ba7b810-9dad-11d1-80b4-00c04fd430c8 not found',
      ts: 2,
    });

    const groups = await t.query(listGroupsRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(2);
  });

  it('groups two failures with different long hex ids under the same fingerprint', async () => {
    const t = makeTestClient();
    const source = await createSource(t);

    await recordFailure(t, source._id, { message: 'Job abcdef123456 failed', ts: 1 });
    await recordFailure(t, source._id, { message: 'Job 1234567890ab failed', ts: 2 });

    const groups = await t.query(listGroupsRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(2);
  });

  it('creates a separate group for the same message on a different queue', async () => {
    const t = makeTestClient();
    const source = await createSource(t);

    await recordFailure(t, source._id, { queueName: 'emails', message: 'boom', ts: 1 });
    await recordFailure(t, source._id, { queueName: 'webhooks', message: 'boom', ts: 2 });

    const groups = await t.query(listGroupsRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
    });
    expect(groups).toHaveLength(2);
  });

  it('increments count and advances lastSeenTs/lastJobId on repeat failures', async () => {
    const t = makeTestClient();
    const source = await createSource(t);

    await recordFailure(t, source._id, { jobId: 'job-1', ts: 1 });
    await recordFailure(t, source._id, { jobId: 'job-2', ts: 2 });
    await recordFailure(t, source._id, { jobId: 'job-3', ts: 3 });

    const groups = await t.query(listGroupsRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
    });
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
    const source = await createSource(t);

    await recordFailure(t, source._id, { ts: 1 });
    const groups = await t.query(listGroupsRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
    });
    await t.mutation(setGroupStateRef, {
      internalToken: INTERNAL_TOKEN,
      groupId: groups[0]._id,
      state: 'resolved',
    });

    await recordFailure(t, source._id, { ts: 2 });

    const reopened = await t.query(getGroupRef, {
      internalToken: INTERNAL_TOKEN,
      groupId: groups[0]._id,
    });
    expect(reopened).toMatchObject({ state: 'open', isRegression: true, count: 2 });
  });

  it('listGroups filters by state using the by_source_state index', async () => {
    const t = makeTestClient();
    const source = await createSource(t);

    await recordFailure(t, source._id, { queueName: 'a', ts: 1 });
    await recordFailure(t, source._id, { queueName: 'b', ts: 2 });
    const groups = await t.query(listGroupsRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
    });
    await t.mutation(setGroupStateRef, {
      internalToken: INTERNAL_TOKEN,
      groupId: groups[0]._id,
      state: 'ignored',
    });

    const ignored = await t.query(listGroupsRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
      state: 'ignored',
    });
    const open = await t.query(listGroupsRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
      state: 'open',
    });
    expect(ignored).toHaveLength(1);
    expect(open).toHaveLength(1);
  });

  it('setGroupState clears isRegression when resolving', async () => {
    const t = makeTestClient();
    const source = await createSource(t);

    await recordFailure(t, source._id, { ts: 1 });
    const [group] = await t.query(listGroupsRef, {
      internalToken: INTERNAL_TOKEN,
      sourceId: source._id,
    });
    await t.mutation(setGroupStateRef, {
      internalToken: INTERNAL_TOKEN,
      groupId: group._id,
      state: 'resolved',
    });
    await recordFailure(t, source._id, { ts: 2 });

    const resolved = await t.mutation(setGroupStateRef, {
      internalToken: INTERNAL_TOKEN,
      groupId: group._id,
      state: 'resolved',
    });
    expect(resolved).toMatchObject({ state: 'resolved', isRegression: false });
  });

  it('getGroup returns null for an unknown group id', async () => {
    const t = makeTestClient();

    const found = await t.query(getGroupRef, {
      internalToken: INTERNAL_TOKEN,
      groupId: 'not-a-real-id',
    });
    expect(found).toBeNull();
  });

  it('recordFailure throws for an unknown source', async () => {
    const t = makeTestClient();

    await expect(recordFailure(t, 'not-a-real-id')).rejects.toThrow(/unknown source/);
  });

  it('throws with the wrong internal token on every function', async () => {
    const t = makeTestClient();
    const source = await createSource(t);

    await expect(
      t.mutation(recordFailureRef, {
        internalToken: 'wrong-token',
        sourceId: source._id,
        queueName: 'emails',
        message: 'boom',
        ts: 1,
      }),
    ).rejects.toThrow();
    await expect(
      t.query(listGroupsRef, { internalToken: 'wrong-token', sourceId: source._id }),
    ).rejects.toThrow();
    await expect(
      t.query(getGroupRef, { internalToken: 'wrong-token', groupId: source._id }),
    ).rejects.toThrow();
    await expect(
      t.mutation(setGroupStateRef, {
        internalToken: 'wrong-token',
        groupId: source._id,
        state: 'resolved',
      }),
    ).rejects.toThrow();
  });
});
