/**
 * Generate landing-page brand assets via FAL.
 * Run: tsx apps/web/scripts/gen-landing-assets.ts [slug|--all]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fal } from '@fal-ai/client';

fal.config({ credentials: process.env.FAL_API_KEY });

const model = 'fal-ai/nano-banana-pro';
const destDir = path.join(process.cwd(), 'public/landing/raw');

// One shared style suffix so the whole mascot family reads as one character.
const bullStyle =
  'Minimalist soft-clay 3D render of a stocky, confident bull character, matte charcoal-black hide with a soft sheen, small blunt burnt-orange horns, thick short neck, big round friendly dark eyes, a small burnt-orange nose ring, Pixar-adjacent toy-like character design, soft studio lighting, gentle shadows. The bull wears a flowing crimson-red superhero cape in matte fabric, fastened around its neck with a small knot at the collar, draping naturally behind its body and shoulders, reading as an integral part of the character with the same soft-clay 3D material as the rest of the bull; the cape has no emblem and no letters on it. Clean pure white background. No text, no words, no letters, no numbers, no watermark, no logo.';

const jobs: Array<{
  slug: string;
  ar: '1:1' | '16:9' | '4:5';
  prompt: string;
}> = [
  {
    slug: 'bull-peek',
    ar: '1:1',
    prompt: `The bull peeks out from behind a plain white rounded rectangular panel, only its head and two front hooves visible gripping the top edge, curious wide eyes, friendly alert expression. A sliver of its red cape is visible fluttering up behind its head and over the panel edge, as if caught mid-motion. The panel is pure flat white. ${bullStyle}`,
  },
  {
    slug: 'bull-presenting',
    ar: '1:1',
    prompt: `The bull stands upright on its hind legs, one front hoof raised in a confident ta-da presenting gesture, chest out, proud grin, satisfied, heroic superhero stance. Its red cape flares out behind its shoulders. ${bullStyle}`,
  },
  {
    slug: 'bull-nightwatch',
    ar: '1:1',
    prompt: `The bull sits calmly upright in the dark, alert half-lidded eyes still watching, a soft warm glow lighting its face from the front as if from an unseen screen, relaxed but attentive posture, cozy quiet mood, like a watchful hero on a quiet stakeout. Its red cape is draped calmly down around its shoulders and pooled slightly behind it. ${bullStyle}`,
  },
  {
    slug: 'bull-running',
    ar: '1:1',
    prompt: `The bull runs energetically to the right at full sprint, head low, one small motion-blur dust puff behind its hooves, determined focused expression, ears back, superhero-in-motion energy. Its red cape streams straight out behind it in the wind from the sprint. ${bullStyle}`,
  },
  {
    slug: 'bull-charge-scene',
    ar: '16:9',
    prompt: `A wide dynamic scene: the bull charging forward head-down through a shattering wall of small flat red cube tiles, fragments of red tiles flying outward, and just behind the bull a few of the shattered fragments are reassembling into small flat green cube tiles that glow softly. Its red cape streams dramatically behind it, whipped by the charge, echoing the flying red tile fragments. Dramatic three-quarter view, dust and motion trails, soft pastel-cream background with lots of clean negative space at the top and left for text, gentle studio lighting. ${bullStyle}`,
  },
  {
    slug: 'bull-hero-ambient',
    ar: '16:9',
    prompt: `A calm, wide ambient scene: the bull stands confidently on all four hooves in a relaxed three-quarter side view, weight settled, head level, calm alert expression, positioned low in the frame on a thin plain floor with a soft contact shadow. Its red cape drapes down its back and rests still, ready to ripple gently. Behind and above the bull is a vast, completely plain, flat near-white cream backdrop with zero texture, zero objects, and zero horizon line — pure empty negative space filling the entire top half of the frame. Nothing else in the scene: no walls, no tiles, no props, no dust, no shadows other than the bull's own. Soft even studio lighting, quiet mood. ${bullStyle}`,
  },
  {
    slug: 'logo-bull-head',
    ar: '1:1',
    prompt:
      'Minimal flat vector logo mark of a confident bull head, front view: geometric charcoal-black rounded head shape, two small blunt burnt-orange horns curving up symmetrically, two small dark round eyes, a small lighter-grey muzzle with a tiny burnt-orange nose ring, bold simple geometry, thick even shapes, flat solid colors only, no gradients, no outline strokes, sticker-like, centered on pure white background. No text, no words, no letters, no watermark.',
  },
];

async function gen(job: (typeof jobs)[number]): Promise<void> {
  console.log(`→ ${job.slug}`);
  const result = await fal.subscribe(model, {
    input: { prompt: job.prompt, aspect_ratio: job.ar },
    logs: false,
  });
  const url = (result.data as { images?: Array<{ url?: string }> }).images?.[0]?.url;
  if (!url) {
    throw new Error(`${job.slug}: no image url returned`);
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${job.slug}: download failed ${res.status}`);
  }
  await fs.mkdir(destDir, { recursive: true });
  await fs.writeFile(path.join(destDir, `${job.slug}.png`), Buffer.from(await res.arrayBuffer()));
  console.log(`✓ ${job.slug}`);
}

async function main(): Promise<void> {
  const arg = process.argv[2];
  const selectedJobs = !arg || arg === '--all' ? jobs : jobs.filter((j) => j.slug === arg);
  if (selectedJobs.length === 0) {
    throw new Error(`unknown slug: ${arg}`);
  }
  for (let i = 0; i < selectedJobs.length; i += 3) {
    await Promise.all(selectedJobs.slice(i, i + 3).map(gen));
  }
}

void main();
