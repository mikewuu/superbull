import { Resend } from 'resend';
import { env } from '../config/env';

let resendClient: Resend | null | undefined;

export function getResend(): Resend | null {
  if (resendClient !== undefined) {
    return resendClient;
  }
  resendClient = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
  return resendClient;
}
