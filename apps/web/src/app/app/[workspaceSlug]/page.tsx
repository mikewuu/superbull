import { redirect } from 'next/navigation';

interface WorkspaceRootPageProps {
  params: Promise<{ workspaceSlug: string }>;
}

// The bare /app/[workspaceSlug] route has no content of its own — it just
// lands on the connectors list, same default landing page the workspace
// switcher and /app's top-level redirect both target.
export default async function WorkspaceRootPage(props: WorkspaceRootPageProps) {
  const { workspaceSlug } = await props.params;
  redirect(`/app/${workspaceSlug}/connectors`);
}
