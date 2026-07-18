import { createHash } from 'node:crypto';
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { notFound } from 'next/navigation';
import { api } from '../../../../convex/_generated/api';
import { AcceptInviteButton } from './_components/accept-invite-button';

export const dynamic = 'force-dynamic';

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

// proxy.ts requires auth for /invite/(.*), so by the time this server
// renders the caller is already signed in — findByTokenHash itself is an
// unauthenticated query (it has to be, so the accept page can render the
// project/role preview before the redirect-to-signin round trip
// completes), but accept() below requires a session.
export default async function InvitePage(props: InvitePageProps) {
  const { token } = await props.params;
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const authToken = await convexAuthNextjsToken();
  const result = await fetchQuery(api.invites.findByTokenHash, { tokenHash }, { token: authToken });
  if (!result) {
    notFound();
  }

  const { invite, project } = result;

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-muted p-6">
      <div className="w-full max-w-sm">
        <div className="candy-card rounded-lg p-6 text-center">
          <h1 className="text-lg font-semibold text-content-emphasis">Join {project.name}</h1>
          <p className="mt-2 text-sm text-content-subtle">
            You&apos;ve been invited to join <strong>{project.name}</strong> as{' '}
            <strong>{invite.role}</strong>.
          </p>
          <div className="mt-5">
            <AcceptInviteButton tokenHash={tokenHash} />
          </div>
        </div>
      </div>
    </div>
  );
}
