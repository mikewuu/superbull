import { beforeEach, describe, expect, it, vi } from 'vitest';

const { created, revalidated } = vi.hoisted(() => {
  return { created: [] as unknown[], revalidated: [] as string[] };
});

const fakeWorkspace = { _id: 'workspace-1', name: 'Acme', slug: 'acme' };

vi.mock('next/cache', () => {
  return {
    revalidatePath: (path: string) => {
      revalidated.push(path);
    },
  };
});

vi.mock('../src/lib/workspaces/require-workspace-for-slug', () => {
  return {
    async requireWorkspaceForSlug(slug: string) {
      return { workspace: { ...fakeWorkspace, slug }, member: { role: 'owner' } };
    },
  };
});

vi.mock('../src/lib/alerts/create-alert-rule', () => {
  return {
    async createAlertRule(args: unknown) {
      created.push(args);
      return { id: 'rule-1', ...(args as Record<string, unknown>) };
    },
  };
});

vi.mock('../src/lib/alerts/update-alert-rule', () => {
  return {
    async updateAlertRule(args: { id: string; isEnabled?: boolean }) {
      return { id: args.id, isEnabled: args.isEnabled };
    },
  };
});

vi.mock('../src/lib/alerts/delete-alert-rule', () => {
  return {
    async deleteAlertRule(_workspaceId: string, _id: string) {
      return undefined;
    },
  };
});

beforeEach(() => {
  vi.resetModules();
  created.length = 0;
  revalidated.length = 0;
});

function buildFormData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

describe('createAlertRuleAction', () => {
  it('rejects a missing email', async () => {
    const { createAlertRuleAction } = await import('../src/app/app/[workspaceSlug]/alerts/actions');

    const result = await createAlertRuleAction(
      'acme',
      { error: null },
      buildFormData({ type: 'new_error_group', windowMinutes: '5', email: '' }),
    );

    expect(result.error).toMatch(/email/i);
    expect(created).toHaveLength(0);
  });

  it('rejects a missing or non-positive window', async () => {
    const { createAlertRuleAction } = await import('../src/app/app/[workspaceSlug]/alerts/actions');

    const result = await createAlertRuleAction(
      'acme',
      { error: null },
      buildFormData({ type: 'new_error_group', windowMinutes: '0', email: 'a@example.com' }),
    );

    expect(result.error).toMatch(/window/i);
  });

  it('rejects a failed_threshold rule without a threshold', async () => {
    const { createAlertRuleAction } = await import('../src/app/app/[workspaceSlug]/alerts/actions');

    const result = await createAlertRuleAction(
      'acme',
      { error: null },
      buildFormData({ type: 'failed_threshold', windowMinutes: '5', email: 'a@example.com' }),
    );

    expect(result.error).toMatch(/threshold/i);
  });

  it('rejects a stuck_queue rule without a queue name', async () => {
    const { createAlertRuleAction } = await import('../src/app/app/[workspaceSlug]/alerts/actions');

    const result = await createAlertRuleAction(
      'acme',
      { error: null },
      buildFormData({ type: 'stuck_queue', windowMinutes: '5', email: 'a@example.com' }),
    );

    expect(result.error).toMatch(/queue/i);
  });

  it('creates the rule and revalidates on a valid submission', async () => {
    const { createAlertRuleAction } = await import('../src/app/app/[workspaceSlug]/alerts/actions');

    const result = await createAlertRuleAction(
      'acme',
      { error: null },
      buildFormData({
        type: 'failed_threshold',
        windowMinutes: '5',
        threshold: '3',
        email: 'a@example.com',
      }),
    );

    expect(result.error).toBeNull();
    expect(created).toHaveLength(1);
    expect(revalidated).toContain('/app/acme/alerts');
  });
});

describe('setAlertRuleEnabledAction and deleteAlertRuleAction', () => {
  it('revalidates the alerts page after toggling a rule', async () => {
    const actions = await import('../src/app/app/[workspaceSlug]/alerts/actions');

    await actions.setAlertRuleEnabledAction('acme', 'rule-1', false);

    expect(revalidated).toContain('/app/acme/alerts');
  });

  it('revalidates the alerts page after deleting a rule', async () => {
    const actions = await import('../src/app/app/[workspaceSlug]/alerts/actions');

    await actions.deleteAlertRuleAction('acme', 'rule-1');

    expect(revalidated).toContain('/app/acme/alerts');
  });
});
