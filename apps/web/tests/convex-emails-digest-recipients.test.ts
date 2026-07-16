import { describe, expect, it } from 'vitest';
import { groupRecipientsByWorkspace } from '../convex/emails/digestRecipients';

function buildRule(email: string, workspaceId: string) {
  return { email, workspaceId };
}

describe('groupRecipientsByWorkspace', () => {
  it('dedupes emails within a workspace', () => {
    const groups = groupRecipientsByWorkspace([
      buildRule('a@example.com', 'ws-1'),
      buildRule('a@example.com', 'ws-1'),
      buildRule('b@example.com', 'ws-1'),
    ]);

    expect(groups).toEqual([{ workspaceId: 'ws-1', emails: ['a@example.com', 'b@example.com'] }]);
  });

  it('keeps the same email separate across different workspaces', () => {
    const groups = groupRecipientsByWorkspace([
      buildRule('a@example.com', 'ws-1'),
      buildRule('a@example.com', 'ws-2'),
    ]);

    expect(groups).toEqual([
      { workspaceId: 'ws-1', emails: ['a@example.com'] },
      { workspaceId: 'ws-2', emails: ['a@example.com'] },
    ]);
  });

  it('returns an empty list when there are no rules', () => {
    expect(groupRecipientsByWorkspace([])).toEqual([]);
  });
});
