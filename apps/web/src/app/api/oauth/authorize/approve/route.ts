import { randomBytes } from 'node:crypto';
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchMutation, fetchQuery } from 'convex/nextjs';
import { NextResponse } from 'next/server';
import { api } from '../../../../../../convex/_generated/api';
import type { Id } from '../../../../../../convex/_generated/dataModel';
import { hashToken } from '../../../../../lib/auth/hash-token';
import { env } from '../../../../../lib/config/env';
import { isAllowedRedirectUri } from '../../../../oauth/is-allowed-redirect-uri';
import { isRedirectUriRegistered } from '../../../../oauth/is-redirect-uri-registered';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return new Response('Forbidden', { status: 403 });
  }

  const form = await request.formData();
  const clientId = String(form.get('client_id') ?? '');
  const redirectUri = String(form.get('redirect_uri') ?? '');
  const state = String(form.get('state') ?? '');
  const codeChallenge = String(form.get('code_challenge') ?? '');
  const projectId = String(form.get('project_id') ?? '');
  const action = String(form.get('action') ?? '');
  if (!clientId || !redirectUri || !codeChallenge) {
    return new Response('Bad Request', { status: 400 });
  }

  const token = await convexAuthNextjsToken();
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!env.CONVEX_INTERNAL_TOKEN) {
    throw new Error('CONVEX_INTERNAL_TOKEN is required');
  }

  const client = await fetchQuery(api.oauthProvider.getClient, {
    clientId,
    internalToken: env.CONVEX_INTERNAL_TOKEN,
  });
  if (
    !client ||
    !isAllowedRedirectUri(redirectUri) ||
    !isRedirectUriRegistered(client.redirectUris, redirectUri)
  ) {
    return new Response('Bad Request', { status: 400 });
  }

  const redirectUrl = new URL(redirectUri);
  if (state) {
    redirectUrl.searchParams.set('state', state);
  }
  if (action !== 'approve') {
    redirectUrl.searchParams.set('error', 'access_denied');
    return NextResponse.redirect(redirectUrl);
  }
  if (!projectId) {
    return new Response('Bad Request', { status: 400 });
  }

  const code = randomBytes(24).toString('base64url');
  await fetchMutation(
    api.oauthProvider.createAuthCode,
    {
      codeHash: hashToken(code),
      clientId,
      projectId: projectId as Id<'projects'>,
      redirectUri,
      codeChallenge,
    },
    { token },
  );
  redirectUrl.searchParams.set('code', code);
  return NextResponse.redirect(redirectUrl);
}
