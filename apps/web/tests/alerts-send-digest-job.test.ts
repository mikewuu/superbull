import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listMock, summaryMock, sendMock } = vi.hoisted(() => {
  return {
    listMock: vi.fn(),
    summaryMock: vi.fn(),
    sendMock: vi.fn(async () => ({ sent: true, devMode: true })),
  };
});

vi.mock('../src/lib/alerts/list-alert-rules', () => {
  return { listAlertRules: listMock };
});

vi.mock('../src/lib/alerts/get-alert-digest-summary', () => {
  return { getAlertDigestSummary: summaryMock };
});

vi.mock('../src/lib/email/send-digest-email', () => {
  return { sendDigestEmail: sendMock };
});

beforeEach(() => {
  listMock.mockReset();
  summaryMock.mockReset();
  sendMock.mockClear();
});

function buildRule(email: string) {
  return {
    id: `rule-${email}`,
    email,
    sourceId: null,
    type: 'failed_threshold',
    queueName: null,
    threshold: 1,
    windowMinutes: 5,
    isEnabled: true,
  };
}

describe('sendDigest job', () => {
  it('registers under the send-digest id', async () => {
    const { sendDigest } = await import('../src/jobs/send-digest');

    expect(sendDigest.id).toBe('send-digest');
  });

  it('sends one digest per distinct rule email', async () => {
    listMock.mockResolvedValue([
      buildRule('a@example.com'),
      buildRule('a@example.com'),
      buildRule('b@example.com'),
    ]);
    summaryMock.mockResolvedValue({ perSource: [] });
    const { sendDigest } = await import('../src/jobs/send-digest');
    const log = vi.fn();

    await sendDigest.handle({}, { log });

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(sendMock).toHaveBeenCalledWith({ to: 'a@example.com', perSource: [] });
    expect(sendMock).toHaveBeenCalledWith({ to: 'b@example.com', perSource: [] });
    expect(log).toHaveBeenCalledWith('[send-digest] sent digest to 2 recipient(s)');
  });

  it('skips the summary query and sends nothing when no rules exist', async () => {
    listMock.mockResolvedValue([]);
    const { sendDigest } = await import('../src/jobs/send-digest');

    await sendDigest.handle({}, { log: vi.fn() });

    expect(summaryMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });
});
