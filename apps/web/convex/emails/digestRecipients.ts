export interface DigestRecipientRule {
  email: string;
  workspaceId: string;
}

export interface WorkspaceDigestRecipients {
  workspaceId: string;
  emails: string[];
}

/**
 * Groups alert-rule emails by workspace and dedupes within each workspace.
 * Pure so it's unit-testable without a running Convex backend.
 *
 * Grouping by workspace (rather than a flat dedupe across every rule, as the
 * pre-multi-tenant `apps/web/src/jobs/send-digest.ts` did) matters now that
 * alertRules carry a workspaceId: without it, every recipient's digest would
 * include every OTHER workspace's connector stats too — a cross-tenant data
 * leak. Within a workspace, two rules sharing an email still collapse to one
 * digest send for that workspace (matching the original dedupe behavior,
 * enabled or not — `isEnabled` isn't checked here, same as the code this
 * replaces).
 */
export function groupRecipientsByWorkspace(
  rules: DigestRecipientRule[],
): WorkspaceDigestRecipients[] {
  const emailsByWorkspace = new Map<string, Set<string>>();
  for (const rule of rules) {
    const emails = emailsByWorkspace.get(rule.workspaceId) ?? new Set<string>();
    emails.add(rule.email);
    emailsByWorkspace.set(rule.workspaceId, emails);
  }
  return [...emailsByWorkspace.entries()].map(([workspaceId, emails]) => ({
    workspaceId,
    emails: [...emails],
  }));
}
