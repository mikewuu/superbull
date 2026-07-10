/**
 * Generate logo mark candidates via FAL. Pick the best by hand afterward.
 * Run: tsx apps/web/scripts/gen-logo-candidates.ts
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fal } from '@fal-ai/client';

fal.config({ credentials: process.env.FAL_API_KEY });

const destDir = path.join(process.cwd(), 'public/landing/raw/logos');
const faviconDestDir = path.join(process.cwd(), 'public/landing/raw/favicon');

const flyingStyle =
  'bold simple geometry, flat solid colors only, two colors total (near-black and crimson-red), no gradients, no outline strokes, sticker-like, centered on pure white background. No text, no letters, no watermark.';

const faviconStyle =
  'extremely simplified two-shape icon, only 2 total flat colors (near-black and crimson-red), no gradients, no outlines, no fine detail, no eyes, huge bold forms that fill almost the entire square canvas edge to edge, must read clearly as a tiny 16x16 pixel app icon, sticker-like, centered on pure white background. No text, no letters, no watermark.';

const jobs = [
  [
    'logo-fly-horizontal',
    `Minimal flat vector logo mark: solid near-black bull silhouette in full-body horizontal flying pose like a superhero, both forelegs extended straight forward, hind legs trailing behind, small horns visible on the head, a flat crimson-red superhero cape flowing straight back from the shoulders above the body, ${flyingStyle}`,
  ],
  [
    'logo-fly-diagonal',
    `Minimal flat vector logo mark: solid near-black bull silhouette flying at a slight upward diagonal like a superhero taking off, one foreleg punched forward and the other tucked, hind legs trailing, small horns visible, a flat crimson-red cape flowing behind and slightly below the body, ${flyingStyle}`,
  ],
  [
    'logo-fly-bigcape',
    `Minimal flat vector logo mark: solid near-black chunky bull silhouette in horizontal superhero flying pose, forelegs extended forward, hind legs trailing, small horns, with one large bold flat crimson-red cape shape as a single sweeping mass billowing behind the whole body, the cape as big as the bull, ${flyingStyle}`,
  ],
  [
    'logo-fly-onefist',
    `Minimal flat vector logo mark: solid near-black bull silhouette in classic Superman flying pose, one foreleg extended straight forward like a fist, head up with small horns, body horizontal, hind legs together trailing, a flat crimson-red cape streaming behind from the shoulders in two simple points, ${flyingStyle}`,
  ],
  [
    'logo-fly-compact',
    `Minimal flat vector app-icon logo mark: extremely simplified solid near-black bull silhouette in horizontal flying pose, thick chunky rounded shapes, forelegs merged into one forward-pointing shape, hind legs merged into one trailing shape, tiny horns, no eyes no face details, one bold flat crimson-red cape as a simple triangular flag shape flowing behind, ${flyingStyle}`,
  ],
] as const;

const faviconJobs = [
  [
    'favicon-head-cape',
    `Minimal flat vector app icon: one huge chunky solid near-black bull head filling most of the square, facing forward, two thick short horns, no eyes no nostrils no face lines, a single bold flat crimson-red cape collar shape peeking out from behind one side of the head, ${faviconStyle}`,
  ],
  [
    'favicon-horns-block',
    `Minimal flat vector app icon: two total shapes only, one giant solid near-black rounded block shape suggesting a bull head with two thick short horns on top, one giant flat crimson-red triangular cape wedge shape overlapping the bottom corner, both shapes huge and simplified, ${faviconStyle}`,
  ],
  [
    'favicon-charge-blob',
    `Minimal flat vector app icon: one massive solid near-black blob silhouette of a charging bull head and shoulders seen from the side, two short thick horns, a single flat crimson-red cape flag shape trailing from the top corner, ${faviconStyle}`,
  ],
] as const;

async function generate(dir: string, slug: string, prompt: string): Promise<void> {
  console.log(`→ ${slug}`);
  const r = await fal.subscribe('fal-ai/nano-banana-pro', {
    input: { prompt, aspect_ratio: '1:1' },
    logs: false,
  });
  const url = (r.data as { images?: Array<{ url?: string }> }).images?.[0]?.url;
  if (!url) {
    console.log(`✗ ${slug}`);
    return;
  }
  const res = await fetch(url);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${slug}.png`), Buffer.from(await res.arrayBuffer()));
  console.log(`✓ ${slug}`);
}

async function main(): Promise<void> {
  const faviconOnly = process.argv.includes('--favicon-only');
  if (!faviconOnly) {
    for (const [slug, prompt] of jobs) {
      await generate(destDir, slug, prompt);
    }
  }
  for (const [slug, prompt] of faviconJobs) {
    await generate(faviconDestDir, slug, prompt);
  }
}

void main();
