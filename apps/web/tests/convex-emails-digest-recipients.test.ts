import { describe, expect, it } from 'vitest';
import { groupRecipientsByProject } from '../convex/emails/digestRecipients';

function buildRule(email: string, projectId: string) {
  return { email, projectId };
}

describe('groupRecipientsByProject', () => {
  it('dedupes emails within a project', () => {
    const groups = groupRecipientsByProject([
      buildRule('a@example.com', 'ws-1'),
      buildRule('a@example.com', 'ws-1'),
      buildRule('b@example.com', 'ws-1'),
    ]);

    expect(groups).toEqual([{ projectId: 'ws-1', emails: ['a@example.com', 'b@example.com'] }]);
  });

  it('keeps the same email separate across different projects', () => {
    const groups = groupRecipientsByProject([
      buildRule('a@example.com', 'ws-1'),
      buildRule('a@example.com', 'ws-2'),
    ]);

    expect(groups).toEqual([
      { projectId: 'ws-1', emails: ['a@example.com'] },
      { projectId: 'ws-2', emails: ['a@example.com'] },
    ]);
  });

  it('returns an empty list when there are no rules', () => {
    expect(groupRecipientsByProject([])).toEqual([]);
  });
});
