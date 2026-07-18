import { NewProjectForm } from './_components/new-project-form';

export const dynamic = 'force-dynamic';

export default function NewProjectPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-muted p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-content-emphasis">Create a project</h1>
          <p className="mt-1 text-sm text-content-subtle">
            You don&apos;t belong to any project yet.
          </p>
        </div>
        <div className="candy-card rounded-lg p-6">
          <NewProjectForm />
        </div>
      </div>
    </div>
  );
}
