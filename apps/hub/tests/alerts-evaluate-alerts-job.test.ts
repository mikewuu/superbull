import { beforeEach, describe, expect, it, vi } from 'vitest';

const { evaluateMock, sendMock } = vi.hoisted(() => {
  return {
    evaluateMock: vi.fn(),
    sendMock: vi.fn(async () => ({ sent: true, devMode: true })),
  };
});

vi.mock('../src/lib/alerts/evaluate-alert-rules', () => {
  return { evaluateAlertRules: evaluateMock };
});

vi.mock('../src/lib/email/send-alert-email', () => {
  return { sendAlertEmail: sendMock };
});

beforeEach(() => {
  evaluateMock.mockReset();
  sendMock.mockClear();
});

describe('evaluateAlerts job', () => {
  it('registers under the evaluate-alerts id', async () => {
    const { evaluateAlerts } = await import('../src/jobs/evaluate-alerts');

    expect(evaluateAlerts.id).toBe('evaluate-alerts');
  });

  it('evaluates rules and sends an alert email per notification', async () => {
    evaluateMock.mockResolvedValue({
      evaluated: 2,
      toNotify: [
        {
          ruleId: 'rule-1',
          email: 'a@example.com',
          type: 'failed_threshold',
          queueName: 'emails',
          summary: 'x',
          kind: 'firing',
        },
      ],
    });
    const { evaluateAlerts } = await import('../src/jobs/evaluate-alerts');
    const log = vi.fn();

    await evaluateAlerts.handle({}, { log });

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith({
      to: 'a@example.com',
      kind: 'firing',
      type: 'failed_threshold',
      summary: 'x',
      queueName: 'emails',
    });
    expect(log).toHaveBeenCalledWith('[evaluate-alerts] evaluated 2 rule(s), notified 1');
  });

  it('sends no email when nothing needs notifying', async () => {
    evaluateMock.mockResolvedValue({ evaluated: 3, toNotify: [] });
    const { evaluateAlerts } = await import('../src/jobs/evaluate-alerts');

    await evaluateAlerts.handle({}, { log: vi.fn() });

    expect(sendMock).not.toHaveBeenCalled();
  });
});
