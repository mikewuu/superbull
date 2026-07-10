/**
 * Remove backgrounds from mascot pose images via fal-ai/birefnet/v2,
 * producing transparent PNG cutouts for prop placement.
 * Run: tsx apps/web/scripts/cutout-assets.ts
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fal } from '@fal-ai/client';

fal.config({ credentials: process.env.FAL_API_KEY });

const rawDir = path.join(process.cwd(), 'public/landing/raw');
const outDir = path.join(process.cwd(), 'public/landing/raw/cutouts');

const slugs = ['bull-peek', 'bull-presenting', 'bull-nightwatch', 'bull-running'];

async function cutout(slug: string): Promise<void> {
  console.log(`→ ${slug}`);
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
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, `${slug}.png`), Buffer.from(await res.arrayBuffer()));
  console.log(`✓ ${slug}`);
}

async function main(): Promise<void> {
  for (let i = 0; i < slugs.length; i += 3) {
    await Promise.all(slugs.slice(i, i + 3).map(cutout));
  }
}

void main();
