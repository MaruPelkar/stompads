import { fal } from '@fal-ai/client';

fal.config({ credentials: 'f6d56902-5686-49de-a54e-7855b2db1bd8:6eaf0234e796d5da62b2412e1b2de04c' });

async function generate() {
  const result = await fal.subscribe('fal-ai/nano-banana-2', {
    input: {
      prompt: 'A bold letter "S" logo on a pure white background. The S is in bright orange (#FF4D00), geometric and modern, slightly angular with sharp edges. Minimal, clean, favicon-ready. No other elements, no text, no decorations. Just the orange S on white.',
      aspect_ratio: '1:1',
      resolution: '1K',
      num_images: 1,
    },
  });
  console.log(JSON.stringify({ url: result.data?.images?.[0]?.url }));
}

generate().catch(console.error);
