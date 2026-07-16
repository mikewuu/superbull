import { render } from '@react-email/render';
import { createElement } from 'react';
import { env } from '../config/env';
import { DigestEmail, type DigestEmailProps } from '../emails/templates/digest-email';
import { getResend } from './get-resend';

export interface SendDigestEmailArgs {
  to: string;
  perSource: DigestEmailProps['perSource'];
}

export interface SendEmailResult {
  sent: boolean;
  devMode: boolean;
}

export async function sendDigestEmail(args: SendDigestEmailArgs): Promise<SendEmailResult> {
  const { to, perSource } = args;
  const subject = '[superbull] daily digest';
  const html = await render(createElement(DigestEmail, { perSource }));

  const resend = getResend();
  if (!resend) {
    console.info('[email:dev] send skipped (no RESEND_API_KEY)', { to, subject });
    return { sent: true, devMode: true };
  }

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM ?? 'superbull <alerts@resend.dev>',
    to,
    subject,
    html,
  });
  if (error) {
    throw new Error(error.message ?? 'resend send failed');
  }
  return { sent: true, devMode: false };
}
