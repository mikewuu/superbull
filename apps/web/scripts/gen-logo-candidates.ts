/**
 * Generate logo mark candidates via FAL. Pick the best by hand afterward.
 * Run: tsx apps/web/scripts/gen-logo-candidates.ts
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fal } from '@fal-ai/client';

fal.config({ credentials: process.env.FAL_API_KEY });

const destDir = path.join(process.cwd(), 'public/landing/raw/logos');

const jobs = [
  [
    'logo-head-front',
    'Minimal flat vector logo mark of a confident bull head, front view: geometric charcoal-black rounded head shape, two small blunt burnt-orange horns curving up symmetrically, two small dark round eyes, a small lighter-grey muzzle with a tiny burnt-orange nose ring, bold simple geometry, thick even shapes, flat solid colors only, no gradients, no outline strokes, sticker-like, centered on pure white background. No text, no letters, no watermark.',
  ],
  [
    'logo-horns-only',
    'Minimal modern app-icon logo mark: a single geometric charcoal-black rounded squircle shape with two small symmetric burnt-orange horns rising from the top edge, flat solid colors, no gradients, no outline strokes, clean premium abstract mark, centered on pure white background. No text, no letters, no watermark.',
  ],
  [
    'logo-head-side',
    'Minimal flat vector logo mark of a bull head in side profile facing right: bold geometric charcoal-black silhouette, one small blunt burnt-orange horn visible, simple rounded shapes, flat solid colors only, no gradients, no outline strokes, sticker-like, centered on pure white background. No text, no letters, no watermark.',
  ],
  [
    'logo-chart-horns',
    'Minimal clever logo mark: a rounded charcoal-black squircle bull head where the two horns are shaped like a small rising bar-chart, two bars of increasing height in burnt-orange, flat solid colors, no gradients, no outline strokes, centered on pure white, modern premium app icon. No text, no letters, no watermark.',
  ],
] as const;

async function main(): Promise<void> {
  for (const [slug, prompt] of jobs) {
    console.log(`→ ${slug}`);
    const r = await fal.subscribe('fal-ai/nano-banana-pro', {
      input: { prompt, aspect_ratio: '1:1' },
      logs: false,
    });
    const url = (r.data as { images?: Array<{ url?: string }> }).images?.[0]?.url;
    if (!url) {
      console.log(`✗ ${slug}`);
      continue;
    }
    const res = await fetch(url);
    await fs.mkdir(destDir, { recursive: true });
    await fs.writeFile(path.join(destDir, `${slug}.png`), Buffer.from(await res.arrayBuffer()));
    console.log(`✓ ${slug}`);
  }
}

void main();
