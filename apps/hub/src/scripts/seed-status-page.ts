import { upsertSourceByName } from '../lib/sources/upsert-source-by-name';
import { upsertStatusPageConfig } from '../lib/status-pages/upsert-status-page-config';

const sourceName = 'SuperBull Dev Status Demo';
const slug = 'dev-demo';

async function main(): Promise<void> {
  const source = await upsertSourceByName({
    name: sourceName,
    url: 'http://127.0.0.1:4655',
    token: 'dev-status-demo-token',
  });

  await upsertStatusPageConfig({
    sourceId: source.id,
    slug,
    isEnabled: true,
    title: 'SuperBull Dev Status',
  });

  console.log(`seeded status page: http://localhost:4600/status/${slug}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
