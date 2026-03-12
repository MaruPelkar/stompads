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

/** Filter to only valid http(s) URLs */
function validUrls(urls: string[]): string[] {
  return urls.filter(u => u && (u.startsWith('http://') || u.startsWith('https://')))
}

export async function generateImageAd(
  prompt: string,
  aspectRatio: AspectRatio,
  referenceImageUrls?: string[],
  traceId?: string
): Promise<GeneratedAd> {
  const trace = traceId
    ? langfuse.trace({ id: traceId })
    : langfuse.trace({ name: 'generate-image-ad' })

  const validRefs = referenceImageUrls ? validUrls(referenceImageUrls) : []
  const hasReferences = validRefs.length > 0
  const model = hasReferences ? FAL_IMAGE_MODEL_EDIT : FAL_IMAGE_MODEL_BASE

  const span = trace.span({
    name: 'fal-image-generation',
    metadata: { model, aspectRatio, hasReferences, refCount: validRefs.length },
    input: { prompt: prompt.slice(0, 200) },
  })

  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: aspectRatio,
    resolution: '1K',
    num_images: 1,
  }

  if (hasReferences) {
    input.image_urls = validRefs
  }

  try {
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
  } catch (err) {
    // If edit model fails (e.g. bad reference URLs), retry with base model
    if (hasReferences && model === FAL_IMAGE_MODEL_EDIT) {
      console.warn(`[FAL_EDIT_FAILED] Falling back to base model. Error: ${err instanceof Error ? err.message : err}`)
      span.end({ output: { error: 'Edit model failed, falling back to base', fallback: true } })
      await langfuse.flushAsync()

      const fallbackResult = await fal.subscribe(FAL_IMAGE_MODEL_BASE, {
        input: { prompt, aspect_ratio: aspectRatio, resolution: '1K', num_images: 1 },
      })
      const fallbackData = fallbackResult.data as FalImageOutput
      const fallbackUrl = fallbackData?.images?.[0]?.url
      if (!fallbackUrl) throw new Error('Fallback base model also failed — no image URL')

      return { url: fallbackUrl, type: 'image', requestId: fallbackResult.requestId || '' }
    }
    throw err
  }
}

const FAL_SUBTITLE_MODEL = 'fal-ai/workflow-utilities/auto-subtitle'

interface FalSubtitleOutput {
  video?: { url: string }
  transcription?: string
  subtitle_count?: number
}

/**
 * Step 1: Generate raw video via Sora 2 Pro
 */
export async function generateRawVideo(
  prompt: string,
  traceId?: string
): Promise<GeneratedAd> {
  const trace = traceId
    ? langfuse.trace({ id: traceId })
    : langfuse.trace({ name: 'generate-raw-video' })

  const span = trace.span({
    name: 'fal-video-generation',
    metadata: { model: FAL_VIDEO_MODEL },
    input: { prompt: prompt.slice(0, 200) },
  })

  try {
    const result = await fal.subscribe(FAL_VIDEO_MODEL, {
      input: {
        prompt,
        duration: 12 as unknown as '12',
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    span.end({ output: { error: msg } })
    await langfuse.flushAsync()
    throw new Error(`Video generation failed (sora-2): ${msg}`)
  }
}

/**
 * Step 2: Add auto-subtitles to a video via fal-ai/workflow-utilities/auto-subtitle
 */
export async function addSubtitles(
  videoUrl: string,
  traceId?: string
): Promise<string> {
  const trace = traceId
    ? langfuse.trace({ id: traceId })
    : langfuse.trace({ name: 'add-subtitles' })

  const span = trace.span({
    name: 'fal-auto-subtitle',
    metadata: { model: FAL_SUBTITLE_MODEL },
    input: { videoUrl },
  })

  try {
    const result = await fal.subscribe(FAL_SUBTITLE_MODEL, {
      input: {
        video_url: videoUrl,
        language: 'en',
        font_name: 'Montserrat',
        font_size: 80,
        font_weight: 'bold',
        font_color: 'white',
        highlight_color: 'orange',
        stroke_width: 3,
        stroke_color: 'black',
        background_color: 'none',
        position: 'bottom',
        y_offset: 75,
        words_per_subtitle: 3,
        enable_animation: true,
      },
    })
    const data = result.data as FalSubtitleOutput

    const subtitledUrl = data?.video?.url
    if (!subtitledUrl) {
      span.end({ output: { error: 'No subtitled video URL' } })
      await langfuse.flushAsync()
      throw new Error('No subtitled video URL in response')
    }

    span.end({ output: { url: subtitledUrl, subtitleCount: data.subtitle_count } })
    await langfuse.flushAsync()

    return subtitledUrl
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    span.end({ output: { error: msg } })
    await langfuse.flushAsync()
    // Non-fatal: return original video if subtitling fails
    console.warn(`[SUBTITLE_FAILED] Returning raw video. Error: ${msg}`)
    return videoUrl
  }
}

/**
 * Full pipeline: Generate video + add subtitles
 */
export async function generateVideoAd(
  prompt: string,
  traceId?: string
): Promise<GeneratedAd> {
  // Step 1: Generate raw video
  const rawVideo = await generateRawVideo(prompt, traceId)

  // Step 2: Add subtitles
  const subtitledUrl = await addSubtitles(rawVideo.url, traceId)

  return {
    url: subtitledUrl,
    type: 'video',
    requestId: rawVideo.requestId,
  }
}
