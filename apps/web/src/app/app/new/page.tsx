import { NewWorkspaceForm } from './_components/new-workspace-form';

export const dynamic = 'force-dynamic';

export default function NewWorkspacePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-muted p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-content-emphasis">Create a workspace</h1>
          <p className="mt-1 text-sm text-content-subtle">
            You don&apos;t belong to any workspace yet.
          </p>
        </div>
        <div className="candy-card rounded-lg p-6">
          <NewWorkspaceForm />
        </div>
      </div>
    </div>
  );
}
