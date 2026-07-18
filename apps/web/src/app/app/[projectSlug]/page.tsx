import { redirect } from 'next/navigation';

interface ProjectRootPageProps {
  params: Promise<{ projectSlug: string }>;
}

// The bare /app/[projectSlug] route has no content of its own — it just
// lands on the connectors list, same default landing page the project
// switcher and /app's top-level redirect both target.
export default async function ProjectRootPage(props: ProjectRootPageProps) {
  const { projectSlug } = await props.params;
  redirect(`/app/${projectSlug}/connectors`);
}
