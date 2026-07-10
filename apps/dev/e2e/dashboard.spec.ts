import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test('overview shows horizon stats, workload table and redis health', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();

  await expect(page.getByTestId('stat-jobs-per-minute')).toBeVisible();
  await expect(page.getByTestId('stat-failed-past-24h')).toBeVisible();
  await expect(page.getByTestId('stat-workers')).toBeVisible();
  await expect(page.getByTestId('stat-status')).toContainText('paused');

  await expect(page.getByTestId('workload-row')).toHaveCount(3);
  const syncRow = page.getByTestId('workload-row').filter({ hasText: 'sync-contacts' });
  await expect(syncRow).toContainText('paused');
  await expect(page.getByText(/Redis \d/).first()).toBeVisible();
});

test('sidebar navigates to a queue with tab counts and metrics totals', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('navigation')
    .getByRole('link', { name: /send-emails/ })
    .click();

  await expect(page.getByRole('heading', { name: 'send-emails' })).toBeVisible();
  await page.getByTestId('status-filter-button').click();
  await expect(page.getByTestId('status-tab-waiting')).toContainText('8');
  await expect(page.getByTestId('status-tab-completed')).toContainText('24');
  await expect(page.getByTestId('status-tab-failed')).toContainText('6');
  await expect(page.getByTestId('status-tab-delayed')).toContainText('5');
  await page.keyboard.press('Escape');

  await expect(page.getByTestId('metrics-completed')).toContainText('24');
  await expect(page.getByTestId('metrics-failed')).toContainText('6');
});

test('failed tab lists failing jobs with inline reasons', async ({ page }) => {
  await page.goto('/queue/send-emails?status=failed');
  await expect(page.getByTestId('job-row')).toHaveCount(6);
  await expect(
    page.getByText('SMTP 550: mailbox unavailable for bounced1@example.com'),
  ).toBeVisible();
  await expect(page.getByTestId('job-row').first()).toContainText('failed');
});

test('search filters jobs by name or id', async ({ page }) => {
  await page.goto('/queue/send-emails?status=completed');
  await page.getByPlaceholder('Search by name or id…').fill('password-reset');
  await expect(page.getByTestId('job-row')).toHaveCount(6);
  await expect(page.getByTestId('job-row').first()).toContainText('password-reset');

  await page.getByLabel('Clear search').click();
  await expect(page.getByTestId('job-row')).toHaveCount(10);
});

test('clicking a row opens the full job view with timeline, payload and logs', async ({ page }) => {
  await page.goto('/queue/send-emails?status=failed');
  await page.getByTestId('job-row').first().click();

  await expect(page).toHaveURL(/\/queue\/send-emails\/\d+/);
  await expect(page.getByRole('heading', { name: /bounce-notification/ })).toBeVisible();
  await expect(page.getByText('Created').first()).toBeVisible();
  await expect(page.getByText('Failed reason')).toBeVisible();
  await expect(page.getByText(/SMTP 550/).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Data' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Options' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Logs' })).toBeVisible();
  await expect(page.getByText('rendering template for')).toBeVisible();
});

test('retrying a job from the detail page moves it to waiting', async ({ page }) => {
  await page.goto('/queue/send-emails?status=failed');
  await page.getByTestId('job-row').first().click();

  await expect(page.getByRole('heading', { name: /bounce-notification/ })).toBeVisible();
  await page.locator('header').getByRole('button', { name: 'Retry' }).click();
  await expect(page.locator('header').getByText('waiting', { exact: true })).toBeVisible();

  await page.goto('/queue/send-emails?status=failed');
  await expect(page.getByTestId('job-row')).toHaveCount(5);
});

test('quick retry from a failed row', async ({ page }) => {
  await page.goto('/queue/send-emails?status=failed');
  const firstRow = page.getByTestId('job-row').first();
  await firstRow.hover();
  await firstRow.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByTestId('job-row')).toHaveCount(4);
});

test('promoting a delayed job via the row menu', async ({ page }) => {
  await page.goto('/queue/send-emails?status=delayed');
  await expect(page.getByTestId('job-row')).toHaveCount(5);

  const firstRow = page.getByTestId('job-row').first();
  await firstRow.hover();
  await firstRow.getByLabel('Job actions').click();
  await page.getByRole('button', { name: 'Promote' }).click();
  await expect(page.getByTestId('job-row')).toHaveCount(4);
});

test('pause and resume the queue', async ({ page }) => {
  await page.goto('/queue/send-emails');
  const header = page.locator('header');
  await header.getByRole('button', { name: 'Pause' }).click();
  await expect(header.getByText('paused')).toBeVisible();

  await header.getByRole('button', { name: 'Resume' }).click();
  await expect(header.getByText('paused')).toHaveCount(0);
});

test('adding a job via the dialog', async ({ page }) => {
  await page.goto('/queue/send-emails');
  await page.getByRole('button', { name: 'Add job' }).click();

  await page.getByLabel('Name').fill('e2e-probe');
  await page.getByLabel('Data (JSON)').fill('{"source":"e2e"}');
  await page.getByRole('dialog').getByRole('button', { name: 'Add job' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByPlaceholder('Search by name or id…').fill('e2e-probe');
  await expect(page.getByTestId('job-row')).toHaveCount(1);
  await expect(page.getByTestId('job-row')).toContainText('e2e-probe');
});

test('bulk removing waiting jobs with confirmation', async ({ page }) => {
  await page.goto('/queue/send-emails?status=waiting');
  const rows = page.getByTestId('job-row');
  await expect(rows.first()).toBeVisible();
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThan(0);

  await page.getByLabel('Select all jobs').check();
  await expect(page.getByTestId('bulk-bar')).toContainText(`${rowCount} selected`);

  await page.getByTestId('bulk-bar').getByRole('button', { name: 'Remove' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: `Remove ${rowCount}` })
    .click();

  await expect(page.getByTestId('bulk-bar')).toHaveCount(0);
  await expect(page.getByTestId('job-row')).toHaveCount(2);
});

test('retry all failed via the queue actions menu', async ({ page }) => {
  await page.goto('/queue/send-emails?status=failed');
  await expect(page.getByTestId('job-row')).toHaveCount(4);

  await page.getByLabel('Queue actions').click();
  await page.getByRole('button', { name: 'Retry all failed' }).click();
  await expect(page.getByText(/No failed jobs/)).toBeVisible();
});

test('empty queue via the actions menu with confirmation', async ({ page }) => {
  await page.goto('/queue/send-emails?status=waiting');
  await expect(page.getByTestId('job-row').first()).toBeVisible();

  await page.getByLabel('Queue actions').click();
  await page.getByRole('button', { name: 'Empty queue…' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Empty queue' }).click();

  await expect(page.getByText(/No waiting jobs|No jobs yet/)).toBeVisible();
});

test('paused queue shows its state and prioritized jobs are listed', async ({ page }) => {
  await page.goto('/queue/sync-contacts');
  await expect(page.locator('header').getByText('paused')).toBeVisible();

  await page.goto('/queue/process-videos?status=prioritized');
  await expect(page.getByTestId('job-row')).toHaveCount(3);
  await expect(page.getByTestId('job-row').first()).toContainText('rush-transcode');
});

test('completed job detail shows the return value', async ({ page }) => {
  await page.goto('/queue/process-videos?status=completed');
  await page.getByTestId('job-row').first().click();
  await expect(page).toHaveURL(/\/queue\/process-videos\/\d+/);

  await expect(page.getByRole('heading', { name: 'Return value' })).toBeVisible();
  await expect(page.getByText('s3://videos/')).toBeVisible();
});

test('replaying a job enqueues a fresh copy with the same payload', async ({ page }) => {
  await page.goto('/queue/process-videos?status=completed');
  const firstRow = page.getByTestId('job-row').first();
  const jobName = (await firstRow.locator('span span').first().textContent()) ?? '';
  await firstRow.click();

  await expect(page.getByRole('heading', { name: /./ })).toBeVisible();
  await page.getByRole('button', { name: 'Replay' }).click();

  await page.goto('/queue/process-videos?status=waiting');
  await expect(
    page.getByTestId('job-row').filter({ hasText: jobName.trim() }).first(),
  ).toBeVisible();
});

test('sorting by created toggles order', async ({ page }) => {
  await page.goto('/queue/send-emails?status=completed');
  const firstId = await page
    .getByTestId('job-row')
    .first()
    .locator('span.font-mono')
    .first()
    .textContent();

  await page.getByTestId('sort-created').click();
  await expect(page).toHaveURL(/sort=asc/);
  await expect(
    page.getByTestId('job-row').first().locator('span.font-mono').first(),
  ).not.toHaveText(firstId ?? '');
});

test('per-page selector shows more rows', async ({ page }) => {
  await page.goto('/queue/send-emails?status=completed');
  await expect(page.getByTestId('job-row')).toHaveCount(10);

  await page.getByLabel('Rows').selectOption('50');
  await expect(page).toHaveURL(/per_page=50/);
  await expect(page.getByTestId('job-row')).toHaveCount(24);
});

test('jobs view aggregates job names', async ({ page }) => {
  await page.goto('/queue/send-emails');
  await page.getByTestId('view-names').click();

  const rows = page.getByTestId('job-name-row');
  await expect(rows.first()).toBeVisible();
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThanOrEqual(4);

  await expect(rows.filter({ hasText: 'invoice-receipt' })).toContainText('6');
});

test('run from jobs view enqueues a prefilled job', async ({ page }) => {
  await page.goto('/queue/send-emails');
  await page.getByTestId('view-names').click();

  const row = page.getByTestId('job-name-row').filter({ hasText: 'welcome-email' });
  await row.hover();
  await row.getByRole('button', { name: 'Run' }).click();

  await expect(page.getByLabel('Name')).toHaveValue('welcome-email');
  await page.getByRole('dialog').getByRole('button', { name: 'Add job' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByTestId('view-runs').click();
  await page.getByPlaceholder('Search by name or id…').fill('welcome-email');
  await expect(page.getByTestId('job-row').filter({ hasText: 'waiting' }).first()).toBeVisible();
});

test('multiple status filters combine with OR and clear per chip', async ({ page }) => {
  await page.goto('/queue/process-videos');
  await page.getByTestId('status-filter-button').click();
  await page.getByTestId('status-tab-failed').click();
  await page.getByTestId('status-tab-prioritized').click();
  await page.keyboard.press('Escape');

  await expect(page.getByTestId('applied-status-failed')).toBeVisible();
  await expect(page.getByTestId('applied-status-prioritized')).toBeVisible();
  await expect(page).toHaveURL(/status=failed%2Cprioritized|status=failed,prioritized/);
  await expect(page.getByTestId('job-row')).toHaveCount(5);

  await page.getByLabel('Remove prioritized filter').click();
  await expect(page.getByTestId('job-row')).toHaveCount(2);
});

test('insights section renders stats numbers for the queue', async ({ page }) => {
  await page.goto('/queue/process-videos');
  await page.getByTestId('queue-insights-toggle').click();

  await expect(page.getByText('Wait p50 / p95')).toBeVisible();
  await expect(page.getByText('Run p50 / p95')).toBeVisible();
  await expect(page.getByText('Retry rate')).toBeVisible();
  await expect(page.getByText('Est. drain')).toBeVisible();
  await expect(page.getByTestId('insights-top-errors')).toContainText('ffmpeg exited with code 1');
});

test('workers panel shows a red empty state when no worker is connected', async ({ page }) => {
  await page.goto('/queue/process-videos');
  await page.getByTestId('queue-insights-toggle').click();

  await expect(page.getByTestId('insights-workers')).toContainText('No workers connected');
});

test('cmd-K opens the command palette and navigates to a queue', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+k');

  const input = page.getByPlaceholder('Jump to a queue or run an action…');
  await expect(input).toBeVisible();
  await input.fill('sync-contacts');
  await page.getByText('Go to sync-contacts').click();

  await expect(page).toHaveURL(/\/queue\/sync-contacts/);
  await expect(input).toHaveCount(0);
});

test('replay with edited payload adds a new waiting job carrying the edited data', async ({
  page,
}) => {
  await page.goto('/queue/send-emails?status=completed');
  await page.getByTestId('job-row').first().click();

  await page.getByLabel('Edit and resend job').click();
  const textarea = page.getByLabel('Data (JSON)');
  await expect(textarea).toBeVisible();
  await textarea.fill('{"to":"edited@example.com","source":"e2e-edit"}');
  await page.getByRole('dialog').getByRole('button', { name: 'Replay' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.goto('/queue/send-emails?status=waiting');
  await page.getByTestId('job-row').first().click();
  await expect(page.getByText(/edited@example\.com/)).toBeVisible();
});

test('bulk add creates every job in the array', async ({ page }) => {
  await page.goto('/queue/send-emails?status=waiting');
  const beforeCount = await page.getByTestId('job-row').count();

  await page.getByRole('button', { name: 'Add job' }).click();
  await page.getByTestId('add-job-mode-bulk').click();
  await page.getByLabel(/Jobs — JSON array/).fill(
    JSON.stringify([
      { name: 'bulk-1', data: { source: 'e2e-bulk' } },
      { name: 'bulk-2', data: { source: 'e2e-bulk' } },
      { name: 'bulk-3', data: { source: 'e2e-bulk' } },
    ]),
  );
  await page.getByRole('dialog').getByRole('button', { name: 'Add jobs' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.goto('/queue/send-emails?status=waiting');
  await expect(page.getByTestId('job-row')).toHaveCount(beforeCount + 3);
});

test('drain queue removes waiting jobs via the danger zone menu', async ({ page }) => {
  await page.goto('/queue/sync-contacts?status=waiting');
  await expect(page.getByTestId('job-row').first()).toBeVisible();

  await page.getByLabel('Queue actions').click();
  await page.getByRole('button', { name: 'Drain queue…' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Drain queue' }).click();

  await expect(page.getByText(/No waiting jobs|No jobs yet/)).toBeVisible();
});

test('obliterate queue requires typing the queue name before the confirm button enables', async ({
  page,
}) => {
  await page.goto('/queue/process-videos');
  await page.getByLabel('Queue actions').click();
  await page.getByRole('button', { name: 'Obliterate queue…' }).click();

  const dialog = page.getByRole('dialog');
  const confirmButton = dialog.getByRole('button', { name: 'Obliterate queue' });
  await expect(confirmButton).toBeDisabled();

  await dialog.getByLabel('Queue name confirmation').fill('process-videos');
  await expect(confirmButton).toBeEnabled();
  await confirmButton.click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('No jobs yet')).toBeVisible();
});
