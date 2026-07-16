import { Resend } from 'resend';

let resendClient: Resend | null | undefined;

/**
 * Lazily construct (and cache) a Resend client from the Convex deployment's
 * own env vars. Mirrors the app-side `getResend()` this replaces: returns
 * `null` (rather than throwing) when `RESEND_API_KEY` is unset so callers can
 * no-op in dev/test instead of crashing the cron.
 */
export function getResend(): Resend | null {
  if (resendClient !== undefined) {
    return resendClient;
  }
  const apiKey = process.env.RESEND_API_KEY;
  resendClient = apiKey ? new Resend(apiKey) : null;
  return resendClient;
}
