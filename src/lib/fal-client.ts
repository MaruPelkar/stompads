import { fal } from '@fal-ai/client'
import { langfuse } from './langfuse'

fal.config({ credentials: process.env.FAL_KEY! })

const FAL_IMAGE_MODEL_BASE = 'fal-ai/nano-banana-2'
const FAL_IMAGE_MODEL_EDIT = 'fal-ai/nano-banana-2/edit'
const FAL_VIDEO_MODEL = 'fal-ai/sora-2/text-to-video/pro'

interface FalImageOutput {
  images?: { url: string }[]
  description?: string
}

interface FalVideoOutput {
  video?: { url: string }
  video_id?: string
}

export interface GeneratedAd {
  url: string
  type: 'image' | 'video'
  requestId: string
}

type AspectRatio = '1:1' | '9:16' | '16:9' | '4:5'

export async function generateImageAd(
  prompt: string,
  aspectRatio: AspectRatio,
  referenceImageUrls?: string[],
  traceId?: string
): Promise<GeneratedAd> {
  const trace = traceId
    ? langfuse.trace({ id: traceId })
    : langfuse.trace({ name: 'generate-image-ad' })

  const hasReferences = referenceImageUrls && referenceImageUrls.length > 0
  const model = hasReferences ? FAL_IMAGE_MODEL_EDIT : FAL_IMAGE_MODEL_BASE

  const span = trace.span({
    name: 'fal-image-generation',
    metadata: { model, aspectRatio, hasReferences },
    input: { prompt: prompt.slice(0, 200), referenceCount: referenceImageUrls?.length || 0 },
  })

  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: aspectRatio,
    resolution: '1K',
    num_images: 1,
  }

  if (hasReferences) {
    input.image_urls = referenceImageUrls
  }

  const result = await fal.subscribe(model, { input })
  const data = result.data as FalImageOutput

  const imageUrl = data?.images?.[0]?.url
  if (!imageUrl) {
    span.end({ output: { error: 'No image URL in response' } })
    await langfuse.flushAsync()
    throw new Error(`No image URL in Fal.ai response (model: ${model})`)
  }

  span.end({ output: { url: imageUrl, requestId: result.requestId } })
  await langfuse.flushAsync()

  return { url: imageUrl, type: 'image', requestId: result.requestId || '' }
}

export async function generateVideoAd(
  prompt: string,
  traceId?: string
): Promise<GeneratedAd> {
  const trace = traceId
    ? langfuse.trace({ id: traceId })
    : langfuse.trace({ name: 'generate-video-ad' })

  const span = trace.span({
    name: 'fal-video-generation',
    metadata: { model: FAL_VIDEO_MODEL },
    input: { prompt: prompt.slice(0, 200) },
  })

  const result = await fal.subscribe(FAL_VIDEO_MODEL, {
    input: {
      prompt,
      duration: '12' as const,
      aspect_ratio: '9:16',
      resolution: '720p',
    },
  })
  const data = result.data as FalVideoOutput

  const videoUrl = data?.video?.url
  if (!videoUrl) {
    span.end({ output: { error: 'No video URL in response' } })
    await langfuse.flushAsync()
    throw new Error('No video URL in Fal.ai response')
  }

  span.end({ output: { url: videoUrl, requestId: result.requestId } })
  await langfuse.flushAsync()

  return { url: videoUrl, type: 'video', requestId: result.requestId || '' }
}
