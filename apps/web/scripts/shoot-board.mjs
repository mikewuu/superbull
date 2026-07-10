import path from 'node:path';
import { chromium } from 'playwright';

const outDir = path.join(process.cwd(), 'public/landing/screenshots');

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  await page.goto('http://localhost:3333/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(outDir, 'overview.png') });

  await page.goto('http://localhost:3333/queue/send-emails', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(outDir, 'queue-detail.png') });

  await page.getByRole('button', { name: 'Status' }).click();
  await page
    .getByText('completed', { exact: false })
    .last()
    .click()
    .catch(() => {});
  await page.waitForTimeout(800);

  const completedRow = page.locator('table tbody tr', { hasText: 'completed' }).first();
  if (await completedRow.count().catch(() => 0)) {
    await completedRow.click().catch(() => {});
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: path.join(outDir, 'job-detail.png'),
      clip: { x: 0, y: 0, width: 1440, height: 342 },
    });
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
