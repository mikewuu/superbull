import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { Button } from '@superbull/ui';
import { fetchQuery } from 'convex/nextjs';
import { headers } from 'next/headers';
import Link from 'next/link';
import { api } from '../../../../convex/_generated/api';
import { rateLimitByIp } from '../../../lib/api/is-within-rate-limit';
import { createServerConvexClient } from '../../../lib/convex/create-server-convex-client';
import { isAllowedRedirectUri } from '../is-allowed-redirect-uri';
import { isRedirectUriRegistered } from '../is-redirect-uri-registered';
import { ConsentShell } from './_components/consent-shell';
import { SignInToAuthorize } from './_components/sign-in-to-authorize';

interface AuthorizeParams {
  client_id?: string;
  redirect_uri?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  response_type?: string;
}

interface OAuthAuthorizePageProps {
  searchParams: Promise<AuthorizeParams>;
}

const codeChallengePattern = /^[A-Za-z0-9._~-]{43,128}$/;

export default async function OAuthAuthorizePage(props: OAuthAuthorizePageProps) {
  const requestHeaders = await headers();
  const ip = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
  const withinRateLimit = await rateLimitByIp(ip);
  if (!withinRateLimit) {
    return (
      <ConsentShell>
        <p className="text-sm text-content-subtle">
          Too many connection attempts. Wait a minute, then try again.
        </p>
      </ConsentShell>
    );
  }

  const params = await props.searchParams;
  const clientId = params.client_id;
  const redirectUri = params.redirect_uri;
  const state = params.state;
  const codeChallenge = params.code_challenge;
  const codeChallengeMethod = params.code_challenge_method ?? 'S256';

  if (
    !clientId ||
    !redirectUri ||
    !codeChallenge ||
    params.response_type !== 'code' ||
    !codeChallengePattern.test(codeChallenge) ||
    codeChallengeMethod !== 'S256'
  ) {
    return (
      <ConsentShell>
        <p className="text-sm text-content-subtle">
          This connection request is invalid or incomplete. Close this tab and try again.
        </p>
      </ConsentShell>
    );
  }

  const convex = createServerConvexClient();
  const client = await convex.query(api.oauthProvider.getClient, { clientId });
  if (
    !client ||
    !isAllowedRedirectUri(redirectUri) ||
    !isRedirectUriRegistered(client.redirectUris, redirectUri)
  ) {
    return (
      <ConsentShell>
        <p className="text-sm text-content-subtle">
          Unknown client or redirect URL. Close this tab and try again.
        </p>
      </ConsentShell>
    );
  }

  const token = await convexAuthNextjsToken();
  const authorizeQuery = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  if (state) {
    authorizeQuery.set('state', state);
  }
  const returnUrl = `/oauth/authorize?${authorizeQuery.toString()}`;

  if (!token) {
    return (
      <ConsentShell>
        <div className="mb-6 text-center">
          <img src="/logo-mark.webp" alt="" className="mx-auto h-10 w-auto" />
          <h1 className="mt-3 text-lg font-semibold text-content-emphasis">Sign in to SuperBull</h1>
          <p className="mt-1 text-sm text-content-subtle">
            Sign in to review this connection request.
          </p>
        </div>
        <SignInToAuthorize returnUrl={returnUrl} />
      </ConsentShell>
    );
  }

  const [user, memberships] = await Promise.all([
    fetchQuery(api.oauthProvider.getCurrentUserForAuthorize, {}, { token }),
    fetchQuery(api.projects.listProjectsByUser, {}, { token }),
  ]);
  if (memberships.length === 0) {
    return (
      <ConsentShell>
        <p className="text-sm text-content-subtle">
          You need a project before connecting an app.{' '}
          <Link href="/app/new" className="font-medium text-content-emphasis underline">
            Create one first
          </Link>
          , then try again.
        </p>
      </ConsentShell>
    );
  }

  return (
    <ConsentShell>
      <h1 className="text-center text-lg font-semibold text-content-emphasis">{client.name}</h1>
      <p className="mt-1 text-center text-sm text-content-subtle">
        wants to access SuperBull for {user.email ?? 'your account'}
      </p>

      <div className="mt-6 rounded-lg border border-border-subtle bg-bg-subtle p-4 text-sm">
        <p className="font-medium text-content-emphasis">This app will be able to:</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-content-subtle">
          <li>Read queue, job, error, and analytics data</li>
          <li>Manage queues and jobs in the project you choose</li>
        </ul>
      </div>

      <form method="POST" action="/api/oauth/authorize/approve" className="mt-6">
        <input type="hidden" name="client_id" value={clientId} />
        <input type="hidden" name="redirect_uri" value={redirectUri} />
        <input type="hidden" name="state" value={state ?? ''} />
        <input type="hidden" name="code_challenge" value={codeChallenge} />

        <label
          htmlFor="project_id"
          className="mb-1.5 block text-xs font-medium text-content-subtle"
        >
          Project
        </label>
        <select
          id="project_id"
          name="project_id"
          defaultValue={memberships[0]?.project._id}
          className="mb-6 h-10 w-full rounded-lg border border-border-default bg-white px-3 text-sm text-content-emphasis outline-none focus:ring-2 focus:ring-blue-500/40"
        >
          {memberships.map(({ project }) => (
            <option key={project._id} value={project._id}>
              {project.name}
            </option>
          ))}
        </select>

        <div className="flex gap-3">
          <Button
            type="submit"
            name="action"
            value="deny"
            variant="secondary"
            text="Deny"
            className="flex-1"
          />
          <Button type="submit" name="action" value="approve" text="Allow" className="flex-1" />
        </div>
      </form>
    </ConsentShell>
  );
}
