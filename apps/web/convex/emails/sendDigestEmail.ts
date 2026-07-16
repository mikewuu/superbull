import { render } from '@react-email/render';
import { createElement } from 'react';
import { DigestEmail, type DigestEmailProps } from './digestEmail';
import { getResend } from './getResend';

export interface SendDigestEmailArgs {
  to: string;
  perConnector: DigestEmailProps['perConnector'];
}

export interface SendEmailResult {
  sent: boolean;
  devMode: boolean;
}

/** Pure subject-line builder, kept separate so it's testable without rendering. */
export function digestEmailSubject(): string {
  return '[superbull] daily digest';
}

export async function sendDigestEmail(args: SendDigestEmailArgs): Promise<SendEmailResult> {
  const { to, perConnector } = args;
  const subject = digestEmailSubject();
  const html = await render(createElement(DigestEmail, { perConnector }));

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
