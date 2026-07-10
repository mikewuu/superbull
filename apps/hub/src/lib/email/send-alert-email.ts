import { render } from '@react-email/render';
import { createElement } from 'react';
import { env } from '../config/env';
import { AlertEmail } from '../emails/templates/alert-email';
import { getResend } from './get-resend';

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

export async function sendAlertEmail(args: SendAlertEmailArgs): Promise<SendEmailResult> {
  const { to, kind, type, summary, queueName } = args;
  const subject = `[bullwatch] ${kind === 'firing' ? 'alert firing' : 'alert resolved'}: ${summary}`;
  const html = await render(createElement(AlertEmail, { kind, type, summary, queueName }));

  const resend = getResend();
  if (!resend) {
    console.info('[email:dev] send skipped (no RESEND_API_KEY)', { to, subject });
    return { sent: true, devMode: true };
  }

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM ?? 'bullwatch <alerts@resend.dev>',
    to,
    subject,
    html,
  });
  if (error) {
    throw new Error(error.message ?? 'resend send failed');
  }
  return { sent: true, devMode: false };
}
