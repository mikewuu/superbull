import { getHubDatabase } from '../../lib/db/get-hub-database';

export default async function SourcesPage() {
  const sources = await getHubDatabase().listSources();

  return (
    <div className="space-y-4 text-sm">
      <h2 className="text-base font-medium">Sources</h2>
      <p className="text-neutral-500">
        {sources.length} source{sources.length === 1 ? '' : 's'}
      </p>
      <ul className="divide-y divide-neutral-200">
        {sources.map((source) => (
          <li key={source.id} className="py-2">
            <div className="font-medium">{source.name}</div>
            <div className="text-neutral-500">{source.url}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
