import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { APIRequestContext } from '@playwright/test';
import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const hubApiToken = 'e2e-hub-token';
let connectorId = '';
let workspaceSlug = '';

test('registers a connector via the hub API and shows it in the workspace dashboard', async ({
  page,
  request,
}) => {
  await removeLeftoverSources(request);

  // The dashboard's "New connector" dialog only drives the new gateway
  // enrollment flow (see src/app/app/[workspaceSlug]/connectors/
  // _components/new-connector-dialog.tsx) — the old manual name+url+token
  // form was dropped from the UI. Connectors created through the legacy
  // hub-token API (what the CLI calls directly) still show up in the
  // connectors table; this test exercises that path the same way the CLI
  // does, over HTTP.
  const response = await request.post('/api/sources', {
    headers: { authorization: `Bearer ${hubApiToken}` },
    data: { name: 'E2E Proxy', url: 'http://127.0.0.1:4655', token: 'e2e-proxy-token' },
  });
  expect(response.status()).toBe(201);

  await page.goto('/app');
  await page.waitForURL(/\/app\/[^/]+\/connectors/);

  const row = page.getByTestId('connector-row').filter({ hasText: 'E2E Proxy' });
  await expect(row).toBeVisible();
  await expect(row.getByTestId('connector-health')).toContainText('online');
  await expect(row.getByTestId('connector-queue-count')).toContainText('1');

  const href = await row.getByRole('link').getAttribute('href');
  const match = href?.match(/\/app\/([^/]+)\/connectors\/([^/]+)\//);
  workspaceSlug = match?.[1] ?? '';
  connectorId = match?.[2] ?? '';
  expect(workspaceSlug).not.toBe('');
  expect(connectorId).not.toBe('');
});

test('REST: GET /api/sources returns the connector without its token', async ({ request }) => {
  const response = await request.get('/api/sources', {
    headers: { authorization: `Bearer ${hubApiToken}` },
  });
  expect(response.status()).toBe(200);

  const body = await response.json();
  const source = body.sources.find((candidate: { id: string }) => candidate.id === connectorId);
  expect(source).toBeDefined();
  expect(source).not.toHaveProperty('token');
  expect(source.name).toBe('E2E Proxy');
});

test('two-hop: the connector dashboard renders and job rows load through the proxy', async ({
  page,
}) => {
  await page.goto(`/app/${workspaceSlug}/connectors/${connectorId}/`);
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: /hub-e2e/ })
    .click();

  await expect(page.getByRole('heading', { name: 'hub-e2e' })).toBeVisible();
  await page.goto(`/app/${workspaceSlug}/connectors/${connectorId}/queue/hub-e2e?status=failed`);
  await expect(page.getByTestId('job-row')).toHaveCount(2);
});

test('quick retry on a failed row drops the failed count', async ({ page }) => {
  await page.goto(`/app/${workspaceSlug}/connectors/${connectorId}/queue/hub-e2e?status=failed`);
  const firstRow = page.getByTestId('job-row').first();
  await firstRow.hover();
  await firstRow.getByRole('button', { name: 'Retry' }).click();

  await expect(page.getByTestId('job-row')).toHaveCount(1);
});

test('MCP: tools/list includes list_connectors and list_queues sees the hub-e2e queue', async () => {
  const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4700/api/mcp'), {
    requestInit: { headers: { authorization: `Bearer ${hubApiToken}` } },
  });
  const client = new Client({ name: 'hub-e2e-client', version: '0.0.0' });
  await client.connect(transport);

  const { tools } = await client.listTools();
  expect(tools.map((tool) => tool.name)).toContain('list_connectors');

  const result = await client.callTool({
    name: 'list_queues',
    arguments: { connector_id: connectorId },
  });
  const content = result.content as Array<{ type: string; text: string }>;
  const body = JSON.parse(content[0]?.text ?? '{}');
  expect(body.queues.some((queue: { name: string }) => queue.name === 'hub-e2e')).toBe(true);

  await client.close();
});

test('REST: DELETE removes the connector', async ({ request, page }) => {
  const response = await request.delete(`/api/sources/${connectorId}`, {
    headers: { authorization: `Bearer ${hubApiToken}` },
  });
  expect(response.status()).toBe(204);

  await page.goto(`/app/${workspaceSlug}/connectors`);
  await expect(page.getByTestId('connector-row')).toHaveCount(0);
});

async function removeLeftoverSources(request: APIRequestContext): Promise<void> {
  const response = await request.get('/api/sources', {
    headers: { authorization: `Bearer ${hubApiToken}` },
  });
  const body = await response.json();
  for (const source of body.sources as Array<{ id: string }>) {
    await request.delete(`/api/sources/${source.id}`, {
      headers: { authorization: `Bearer ${hubApiToken}` },
    });
  }
}
