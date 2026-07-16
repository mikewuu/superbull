import { render } from '@react-email/render';
import { createElement } from 'react';
import { AlertEmail } from './alertEmail';
import { getResend } from './getResend';

export interface SendAlertEmailArgs {
  to: string;
  kind: 'firing' | 'resolved';
  type: 'failed_threshold' | 'stuck_queue' | 'worker_loss' | 'new_error_group';
  summary: string;
  queueName: string | null;
}

export interface SendEmailResult {
  sent: boolean;
  devMode: boolean;
}

/** Pure subject-line builder, kept separate so it's testable without rendering. */
export function alertEmailSubject(kind: SendAlertEmailArgs['kind'], summary: string): string {
  return `[superbull] ${kind === 'firing' ? 'alert firing' : 'alert resolved'}: ${summary}`;
}

export async function sendAlertEmail(args: SendAlertEmailArgs): Promise<SendEmailResult> {
  const { to, kind, type, summary, queueName } = args;
  const subject = alertEmailSubject(kind, summary);
  const html = await render(createElement(AlertEmail, { kind, type, summary, queueName }));

  const resend = getResend();
  if (!resend) {
    console.warn('[email:dev] send skipped (no RESEND_API_KEY)', { to, subject });
    return { sent: true, devMode: true };
  }

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'superbull <alerts@resend.dev>',
    to,
    subject,
    html,
  });
  if (error) {
    throw new Error(error.message ?? 'resend send failed');
  }
  return { sent: true, devMode: false };
}
