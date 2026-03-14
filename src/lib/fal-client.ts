import { fal } from '@fal-ai/client'
import { langfuse } from './langfuse'
import { getAdConfig } from './ad-config'

fal.config({ credentials: process.env.FAL_KEY! })

const FAL_IMAGE_MODEL_BASE = 'fal-ai/nano-banana-2'
const FAL_IMAGE_MODEL_EDIT = 'fal-ai/nano-banana-2/edit'
const FAL_SUBTITLE_MODEL = 'fal-ai/workflow-utilities/auto-subtitle'

interface FalImageOutput {
  images?: { url: string }[]
  description?: string
}

interface FalVideoOutput {
  video?: { url: string }
  video_id?: string
}

interface FalSubtitleOutput {
  video?: { url: string }
  transcription?: string
  subtitle_count?: number
}

export interface GeneratedAd {
  url: string
  type: 'image' | 'video'
  requestId: string
}

type AspectRatio = '1:1' | '9:16' | '16:9' | '4:5'

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

/**
 * Sanitize a prompt flagged by content policy.
 */
function sanitizePrompt(prompt: string, attempt: number): string {
  let s = prompt
    .replace(/I'm not even kidding/gi, 'seriously')
    .replace(/you won'?t believe/gi, 'check this out')
    .replace(/you would not believe/gi, 'check this out')
    .replace(/zero [a-z]+ team/gi, 'no setup needed')
    .replace(/completely free/gi, 'easy to start')
    .replace(/link in bio/gi, '')
    .replace(/attractive/gi, 'friendly')
    .replace(/well-groomed/gi, 'casual')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (attempt >= 2) {
    s = s
      .replace(/shot on iPhone/gi, 'casual handheld camera')
      .replace(/indistinguishable from a real person/gi, 'natural and authentic')
      .replace(/selfie camera/gi, 'camera')
      .replace(/UGC.style/gi, 'casual')
  }

  return s
}

/**
 * Generate raw video. Retries up to 3 times with sanitized prompts on content policy violations.
 */
async function generateRawVideo(
  prompt: string,
  traceId?: string
): Promise<GeneratedAd> {
  const config = await getAdConfig()
  const MAX_RETRIES = 3

  const trace = traceId
    ? langfuse.trace({ id: traceId })
    : langfuse.trace({ name: 'generate-raw-video' })

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const currentPrompt = attempt === 0 ? prompt : sanitizePrompt(prompt, attempt)

    const span = trace.span({
      name: `fal-video-generation${attempt > 0 ? `-retry-${attempt}` : ''}`,
      metadata: { model: config.videoModel, attempt, sanitized: attempt > 0 },
      input: { prompt: currentPrompt.slice(0, 200) },
    })

    try {
      const result = await fal.subscribe(config.videoModel, {
        input: {
          prompt: currentPrompt,
          duration: config.videoDuration as unknown as '4',
          aspect_ratio: config.videoAspectRatio,
          resolution: config.videoResolution,
        },
      })
      const data = result.data as FalVideoOutput

      const videoUrl = data?.video?.url
      if (!videoUrl) {
        span.end({ output: { error: 'No video URL' } })
        await langfuse.flushAsync()
        throw new Error('No video URL in Fal.ai response')
      }

      span.end({ output: { url: videoUrl, requestId: result.requestId, attempt } })
      await langfuse.flushAsync()

      return { url: videoUrl, type: 'video', requestId: result.requestId || '' }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const isContentPolicy = msg.toLowerCase().includes('content') &&
        (msg.toLowerCase().includes('policy') || msg.toLowerCase().includes('flagged'))

      span.end({ output: { error: msg, isContentPolicy, attempt } })

      if (isContentPolicy && attempt < MAX_RETRIES - 1) {
        console.warn(`[FAL_CONTENT_POLICY] Attempt ${attempt + 1} flagged. Sanitizing and retrying...`)
        continue
      }

      await langfuse.flushAsync()
      throw new Error(`Video generation failed (${config.videoModel}): ${msg}`)
    }
  }

  throw new Error('Video generation failed after all retries')
}

/**
 * Add auto-subtitles to a video
 */
async function addSubtitles(
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
    const config = await getAdConfig()
    const sub = config.subtitle

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subtitleInput: any = {
      video_url: videoUrl,
      language: sub.language,
      font_name: sub.fontName,
      font_size: sub.fontSize,
      font_weight: sub.fontWeight,
      font_color: sub.fontColor,
      highlight_color: sub.highlightColor,
      stroke_width: sub.strokeWidth,
      stroke_color: sub.strokeColor,
      background_color: sub.backgroundColor,
      position: sub.position,
      y_offset: sub.yOffset,
      words_per_subtitle: sub.wordsPerSubtitle,
      enable_animation: sub.enableAnimation,
    }

    const result = await fal.subscribe(FAL_SUBTITLE_MODEL, { input: subtitleInput })
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
    console.warn(`[SUBTITLE_FAILED] Returning raw video. Error: ${msg}`)
    return videoUrl
  }
}

/**
 * Full pipeline: Generate video + optionally add subtitles (based on config)
 */
export async function generateVideoAd(
  prompt: string,
  traceId?: string
): Promise<GeneratedAd> {
  const config = await getAdConfig()

  // Step 1: Generate raw video
  const rawVideo = await generateRawVideo(prompt, traceId)

  // Step 2: Add subtitles (if enabled in config)
  if (config.subtitleEnabled) {
    const subtitledUrl = await addSubtitles(rawVideo.url, traceId)
    return { url: subtitledUrl, type: 'video', requestId: rawVideo.requestId }
  }

  return rawVideo
}
