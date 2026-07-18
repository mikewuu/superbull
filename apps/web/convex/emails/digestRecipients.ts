export interface DigestRecipientRule {
  email: string;
  projectId: string;
}

export interface ProjectDigestRecipients {
  projectId: string;
  emails: string[];
}

/**
 * Groups alert-rule emails by project and dedupes within each project.
 * Pure so it's unit-testable without a running Convex backend.
 *
 * Grouping by project (rather than a flat dedupe across every rule, as the
 * pre-multi-tenant `apps/web/src/jobs/send-digest.ts` did) matters now that
 * alertRules carry a projectId: without it, every recipient's digest would
 * include every OTHER project's connector stats too — a cross-tenant data
 * leak. Within a project, two rules sharing an email still collapse to one
 * digest send for that project (matching the original dedupe behavior,
 * enabled or not — `isEnabled` isn't checked here, same as the code this
 * replaces).
 */
export function groupRecipientsByProject(rules: DigestRecipientRule[]): ProjectDigestRecipients[] {
  const emailsByProject = new Map<string, Set<string>>();
  for (const rule of rules) {
    const emails = emailsByProject.get(rule.projectId) ?? new Set<string>();
    emails.add(rule.email);
    emailsByProject.set(rule.projectId, emails);
  }
  return [...emailsByProject.entries()].map(([projectId, emails]) => ({
    projectId,
    emails: [...emails],
  }));
}
