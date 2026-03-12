import { fal } from '@fal-ai/client'

fal.config({ credentials: process.env.FAL_KEY! })

// Image generation with product/brand reference
const FAL_IMAGE_MODEL = 'fal-ai/nano-banana-2/edit'
// Video generation (UGC style - person talking to camera)
const FAL_VIDEO_MODEL = 'fal-ai/sora-2/text-to-video/pro'

interface FalImageOutput {
  images?: { url: string }[]
}

interface FalVideoOutput {
  video?: { url: string }
}

export interface GeneratedAd {
  url: string
  type: 'image' | 'video'
  requestId: string
}

export async function generateImageAd(prompt: string, referenceImageUrls?: string[]): Promise<GeneratedAd> {
  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: '1:1',
    resolution: '1K',
    num_images: 1,
  }

  // If we have reference images (e.g. from OG image or ad library), use the edit model
  if (referenceImageUrls && referenceImageUrls.length > 0) {
    input.image_urls = referenceImageUrls
  }

  const result = await fal.subscribe(FAL_IMAGE_MODEL, { input })
  const data = result.data as FalImageOutput

  const imageUrl = data?.images?.[0]?.url
  if (!imageUrl) throw new Error('No image URL in Fal.ai response')

  return {
    url: imageUrl,
    type: 'image',
    requestId: result.requestId || '',
  }
}

export async function generateVideoAd(prompt: string): Promise<GeneratedAd> {
  const result = await fal.subscribe(FAL_VIDEO_MODEL, {
    input: {
      prompt,
      duration: '12' as const, // max duration available (4, 8, or 12 seconds)
      aspect_ratio: '9:16',   // vertical for mobile feed
      resolution: '720p',     // cheaper, good enough for ads
    },
  })
  const data = result.data as FalVideoOutput

  const videoUrl = data?.video?.url
  if (!videoUrl) throw new Error('No video URL in Fal.ai response')

  return {
    url: videoUrl,
    type: 'video',
    requestId: result.requestId || '',
  }
}
