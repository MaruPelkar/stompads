import { fal } from '@fal-ai/client';
import { writeFile } from 'fs/promises';
import { join } from 'path';

fal.config({ credentials: 'f6d56902-5686-49de-a54e-7855b2db1bd8:6eaf0234e796d5da62b2412e1b2de04c' });

const prompts = [
  "A young woman excitedly holding up a sleek skincare product bottle, looking directly at the camera with a genuine smile. Natural lighting, filmed on iPhone style. UGC social media ad aesthetic. Clean minimal background.",
  "A man in his 30s unboxing a premium subscription box, showing genuine surprise and delight. Casual home setting, natural lighting. UGC style vertical video thumbnail. Social media ad.",
  "A fitness enthusiast showing a supplement protein shake with results visible. Before and after vibe. Authentic UGC content style, filmed on phone aesthetic. Social media ad format."
];

const outDir = join(import.meta.dirname, '..', 'public', 'samples');

async function generate() {
  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    console.log(`\nGenerating image ${i + 1}/3...`);
    console.log(`Prompt: ${prompt.slice(0, 60)}...`);

    const result = await fal.subscribe('fal-ai/nano-banana-2', {
      input: {
        prompt,
        aspect_ratio: '9:16',
        resolution: '1K',
        num_images: 1
      }
    });

    const url = result.data?.images?.[0]?.url;
    if (!url) {
      console.error(`No URL returned for image ${i + 1}`, JSON.stringify(result.data, null, 2));
      continue;
    }

    console.log(`URL: ${url}`);

    // Download the image
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to download image ${i + 1}: ${response.status}`);
      continue;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const filePath = join(outDir, `ad${i + 1}.png`);
    await writeFile(filePath, buffer);
    console.log(`Saved to: ${filePath}`);
  }

  console.log('\nDone! All images saved to public/samples/');
}

generate().catch(console.error);
