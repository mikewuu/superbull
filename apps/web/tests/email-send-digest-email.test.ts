import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendDigestEmail } from '../src/lib/email/send-digest-email';

const state = vi.hoisted(() => {
  const send = vi.fn(
    async (_payload: unknown) => ({ data: { id: 'email-1' }, error: null }) as never,
  );
  return { send, client: null as null | { emails: { send: typeof send } } };
});

vi.mock('../src/lib/email/get-resend', () => {
  return { getResend: () => state.client };
});

beforeEach(() => {
  state.send.mockClear();
  state.client = null;
});

describe('sendDigestEmail', () => {
  it('logs a no-op and does not call resend when RESEND_API_KEY is unset', async () => {
    const result = await sendDigestEmail({ to: 'a@example.com', perSource: [] });

    expect(result).toEqual({ sent: true, devMode: true });
    expect(state.send).not.toHaveBeenCalled();
  });

  it('renders per-source totals and top error groups when configured', async () => {
    state.client = { emails: { send: state.send } };

    const result = await sendDigestEmail({
      to: 'a@example.com',
      perSource: [
        {
          sourceId: 'source-1',
          sourceName: 'proxy-a',
          completed: 120,
          failed: 4,
          topErrorGroups: [{ message: 'connection refused', queueName: 'emails', count: 3 }],
        },
      ],
    });

    expect(result).toEqual({ sent: true, devMode: false });
    expect(state.send).toHaveBeenCalledTimes(1);
    const payload = state.send.mock.calls[0]?.[0] as { to: string; html: string };
    expect(payload.to).toBe('a@example.com');
    expect(payload.html).toContain('proxy-a');
    expect(payload.html).toContain('120');
    expect(payload.html).toContain('completed');
    expect(payload.html).toContain('connection refused');
  });
});
