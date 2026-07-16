import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendAlertEmail } from '../convex/emails/sendAlertEmail';

const state = vi.hoisted(() => {
  const send = vi.fn(
    async (_payload: unknown) => ({ data: { id: 'email-1' }, error: null }) as never,
  );
  return { send, client: null as null | { emails: { send: typeof send } } };
});

vi.mock('../convex/emails/getResend', () => {
  return { getResend: () => state.client };
});

beforeEach(() => {
  state.send.mockClear();
  state.client = null;
});

describe('sendAlertEmail', () => {
  it('logs a no-op and does not call resend when RESEND_API_KEY is unset', async () => {
    const result = await sendAlertEmail({
      to: 'a@example.com',
      kind: 'firing',
      type: 'failed_threshold',
      summary: '5 failed jobs in queue emails',
      queueName: 'emails',
    });

    expect(result).toEqual({ sent: true, devMode: true });
    expect(state.send).not.toHaveBeenCalled();
  });

  it('renders the alert template and sends via resend when configured', async () => {
    state.client = { emails: { send: state.send } };

    const result = await sendAlertEmail({
      to: 'a@example.com',
      kind: 'firing',
      type: 'failed_threshold',
      summary: '5 failed jobs in queue emails',
      queueName: 'emails',
    });

    expect(result).toEqual({ sent: true, devMode: false });
    expect(state.send).toHaveBeenCalledTimes(1);
    const payload = state.send.mock.calls[0]?.[0] as { to: string; html: string; subject: string };
    expect(payload.to).toBe('a@example.com');
    expect(payload.subject).toBe('[superbull] alert firing: 5 failed jobs in queue emails');
    expect(payload.html).toContain('5 failed jobs in queue emails');
    expect(payload.html).toContain('Queue:');
  });

  it('throws when resend returns an error', async () => {
    state.client = {
      emails: { send: vi.fn(async () => ({ data: null, error: { message: 'boom' } }) as never) },
    };

    await expect(
      sendAlertEmail({
        to: 'a@example.com',
        kind: 'resolved',
        type: 'worker_loss',
        summary: 'workers back',
        queueName: null,
      }),
    ).rejects.toThrow('boom');
  });
});
