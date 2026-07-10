/**
 * Remove background from the chosen logo candidate via fal-ai/birefnet/v2.
 * Run: tsx apps/web/scripts/cutout-logo.ts
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fal } from '@fal-ai/client';

fal.config({ credentials: process.env.FAL_API_KEY });

const rawDir = path.join(process.cwd(), 'public/landing/raw/logos');
const slug = 'logo-fly-horizontal';

async function main(): Promise<void> {
  const bytes = await fs.readFile(path.join(rawDir, `${slug}.png`));
  const url = await fal.storage.upload(new Blob([new Uint8Array(bytes)], { type: 'image/png' }));
  const result = await fal.subscribe('fal-ai/birefnet/v2', {
    input: { image_url: url },
    logs: false,
  });
  const outUrl = (result.data as { image?: { url?: string } }).image?.url;
  if (!outUrl) {
    throw new Error(`${slug}: no cutout url`);
  }
  const res = await fetch(outUrl);
  if (!res.ok) {
    throw new Error(`${slug}: download failed ${res.status}`);
  }
  await fs.writeFile(path.join(rawDir, `${slug}-cutout.png`), Buffer.from(await res.arrayBuffer()));
  console.log(`✓ ${slug}`);
}

void main();
