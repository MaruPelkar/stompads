import { fal } from '@fal-ai/client';

fal.config({ credentials: 'f6d56902-5686-49de-a54e-7855b2db1bd8:6eaf0234e796d5da62b2412e1b2de04c' });

async function generate() {
  // Image 4 — ecommerce product ad (vertical)
  console.log('Generating image 4...');
  const img4 = await fal.subscribe('fal-ai/nano-banana-2', {
    input: {
      prompt: 'A vibrant vertical social media ad for a premium coffee brand. Shows a stylish coffee bag with fresh coffee beans scattered around it, steam rising from a cup. Warm morning light, lifestyle aesthetic. Clean modern design, social media native look. No text overlays.',
      aspect_ratio: '9:16',
      resolution: '1K',
      num_images: 1,
    },
  });
  console.log('img4:', JSON.stringify({ url: img4.data?.images?.[0]?.url }));

  // Image 5 — fashion/lifestyle ad (square)
  console.log('Generating image 5...');
  const img5 = await fal.subscribe('fal-ai/nano-banana-2', {
    input: {
      prompt: 'A square social media ad for a trendy activewear brand. Shows a young athletic woman in stylish workout clothes doing yoga in a sunlit studio. Aspirational lifestyle photography, Instagram aesthetic. Warm tones, natural lighting. No text or logos.',
      aspect_ratio: '1:1',
      resolution: '1K',
      num_images: 1,
    },
  });
  console.log('img5:', JSON.stringify({ url: img5.data?.images?.[0]?.url }));

  // Video — UGC testimonial style
  console.log('Generating video (this takes a while)...');
  const vid = await fal.subscribe('fal-ai/sora-2/text-to-video/pro', {
    input: {
      prompt: 'A young woman in her 20s talking directly into the camera in a well-lit modern apartment. She is excited and genuine, holding up a small skincare product bottle. She speaks enthusiastically as if recommending a product to a friend. Casual outfit, natural makeup. Shot on iPhone aesthetic, vertical format, natural daylight from a window. UGC social media ad style.',
      duration: 4,
      aspect_ratio: '9:16',
      resolution: '720p',
    },
  });
  console.log('video:', JSON.stringify({ url: vid.data?.video?.url }));
}

generate().catch(console.error);
