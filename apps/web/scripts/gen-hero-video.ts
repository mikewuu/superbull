/**
 * Generate the looping "charge" video: Kling v3 pro image-to-video with the
 * SAME image as start and end frame (seamless loop).
 * Run: tsx apps/web/scripts/gen-hero-video.ts
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fal } from '@fal-ai/client';

fal.config({ credentials: process.env.FAL_API_KEY });

const sourcePath = path.join(process.cwd(), 'public/landing/raw/bull-charge-scene.png');
const outPath = path.join(process.cwd(), 'public/landing/raw/charge-loop-raw.mp4');

async function main(): Promise<void> {
  console.log('→ uploading start/end frame');
  const bytes = await fs.readFile(sourcePath);
  const url = await fal.storage.upload(new Blob([new Uint8Array(bytes)], { type: 'image/png' }));
  console.log('→ generating kling v3 pro loop');
  const result = await fal.subscribe('fal-ai/kling-video/v3/pro/image-to-video', {
    input: {
      prompt:
        'Locked-off tripod camera, the frame never moves. The charcoal-black cartoon bull keeps charging in place, dust puffs continuously from its hooves, red tile fragments keep flying outward and tumbling, the reassembling green tiles behind it pulse with a soft glow, its ears flap and its tail flicks, gentle continuous motion in every region, cinemagraph.',
      negative_prompt:
        'camera movement, camera pan, camera zoom, cuts, text, words, watermark, frozen still image, static image',
      duration: '5',
      start_image_url: url,
      end_image_url: url,
      generate_audio: false,
    },
    logs: false,
  });
  const videoUrl = (result.data as { video?: { url?: string } }).video?.url;
  if (!videoUrl) {
    throw new Error('no video url returned');
  }
  const res = await fetch(videoUrl);
  if (!res.ok) {
    throw new Error(`download failed: ${res.status}`);
  }
  await fs.writeFile(outPath, Buffer.from(await res.arrayBuffer()));
  console.log(`✓ saved ${outPath}`);
}

void main();
