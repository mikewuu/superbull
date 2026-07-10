import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { APIRequestContext } from '@playwright/test';
import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const hubApiToken = 'e2e-hub-token';
let sourceId = '';

test('adds a source via the form and shows online health with the queue count', async ({
  page,
  request,
}) => {
  await removeLeftoverSources(request);

  await page.goto('/');
  await page.getByTestId('add-source-open').click();
  await page.getByTestId('add-source-name').fill('E2E Proxy');
  await page.getByTestId('add-source-url').fill('http://127.0.0.1:4655');
  await page.getByTestId('add-source-token').fill('e2e-proxy-token');
  await page.getByTestId('add-source-submit').click();

  const row = page.getByTestId('source-row').filter({ hasText: 'E2E Proxy' });
  await expect(row).toBeVisible();
  await expect(row.getByTestId('source-health')).toContainText('online');
  await expect(row.getByTestId('source-queue-count')).toContainText('1');

  const href = await row.getByRole('link').getAttribute('href');
  sourceId = href?.match(/\/s\/([^/]+)\//)?.[1] ?? '';
  expect(sourceId).not.toBe('');
});

test('REST: GET /api/sources returns the source without its token', async ({ request }) => {
  const response = await request.get('/api/sources', {
    headers: { authorization: `Bearer ${hubApiToken}` },
  });
  expect(response.status()).toBe(200);

  const body = await response.json();
  const source = body.sources.find((candidate: { id: string }) => candidate.id === sourceId);
  expect(source).toBeDefined();
  expect(source).not.toHaveProperty('token');
  expect(source.name).toBe('E2E Proxy');
});

test('two-hop: the source dashboard renders and job rows load through the proxy', async ({
  page,
}) => {
  await page.goto(`/s/${sourceId}/`);
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: /hub-e2e/ })
    .click();

  await expect(page.getByRole('heading', { name: 'hub-e2e' })).toBeVisible();
  await page.goto(`/s/${sourceId}/queue/hub-e2e?status=failed`);
  await expect(page.getByTestId('job-row')).toHaveCount(2);
});

test('quick retry on a failed row drops the failed count', async ({ page }) => {
  await page.goto(`/s/${sourceId}/queue/hub-e2e?status=failed`);
  const firstRow = page.getByTestId('job-row').first();
  await firstRow.hover();
  await firstRow.getByRole('button', { name: 'Retry' }).click();

  await expect(page.getByTestId('job-row')).toHaveCount(1);
});

test('MCP: tools/list includes list_sources and list_queues sees the hub-e2e queue', async () => {
  const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4600/api/mcp'), {
    requestInit: { headers: { authorization: `Bearer ${hubApiToken}` } },
  });
  const client = new Client({ name: 'hub-e2e-client', version: '0.0.0' });
  await client.connect(transport);

  const { tools } = await client.listTools();
  expect(tools.map((tool) => tool.name)).toContain('list_sources');

  const result = await client.callTool({ name: 'list_queues', arguments: { source_id: sourceId } });
  const content = result.content as Array<{ type: string; text: string }>;
  const body = JSON.parse(content[0]?.text ?? '{}');
  expect(body.queues.some((queue: { name: string }) => queue.name === 'hub-e2e')).toBe(true);

  await client.close();
});

test('REST: DELETE removes the source', async ({ request, page }) => {
  const response = await request.delete(`/api/sources/${sourceId}`, {
    headers: { authorization: `Bearer ${hubApiToken}` },
  });
  expect(response.status()).toBe(204);

  await page.goto('/');
  await expect(page.getByTestId('source-row')).toHaveCount(0);
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
