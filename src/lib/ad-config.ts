import { createAdminClient } from '@/lib/supabase/server'

export interface SubtitleConfig {
  language: string
  fontName: string
  fontSize: number
  fontWeight: string
  fontColor: string
  highlightColor: string
  strokeWidth: number
  strokeColor: string
  backgroundColor: string
  position: string
  yOffset: number
  wordsPerSubtitle: number
  enableAnimation: boolean
}

export interface AdConfig {
  videoModel: string
  videoDuration: number
  videoResolution: string
  videoAspectRatio: string
  subtitleEnabled: boolean
  subtitle: SubtitleConfig
}

const SUBTITLE_DEFAULTS: SubtitleConfig = {
  language: 'en',
  fontName: 'Montserrat',
  fontSize: 80,
  fontWeight: 'bold',
  fontColor: 'white',
  highlightColor: 'orange',
  strokeWidth: 3,
  strokeColor: 'black',
  backgroundColor: 'none',
  position: 'bottom',
  yOffset: 190,
  wordsPerSubtitle: 3,
  enableAnimation: true,
}

const DEFAULTS: AdConfig = {
  videoModel: 'fal-ai/sora-2/text-to-video',
  videoDuration: 4,
  videoResolution: '720p',
  videoAspectRatio: '9:16',
  subtitleEnabled: true,
  subtitle: SUBTITLE_DEFAULTS,
}

let cached: AdConfig | null = null
let cachedAt = 0
const CACHE_TTL = 60_000

export async function getAdConfig(): Promise<AdConfig> {
  const now = Date.now()
  if (cached && now - cachedAt < CACHE_TTL) return cached

  try {
    const supabase = createAdminClient()
    const { data } = await supabase.from('ad_config').select('key, value')

    if (!data || data.length === 0) return DEFAULTS

    const map = new Map(data.map(row => [row.key, row.value]))

    cached = {
      videoModel: map.get('video_model') || DEFAULTS.videoModel,
      videoDuration: parseInt(map.get('video_duration') || String(DEFAULTS.videoDuration)),
      videoResolution: map.get('video_resolution') || DEFAULTS.videoResolution,
      videoAspectRatio: map.get('video_aspect_ratio') || DEFAULTS.videoAspectRatio,
      subtitleEnabled: (map.get('subtitle_enabled') || 'true') === 'true',
      subtitle: {
        language: map.get('subtitle_language') || SUBTITLE_DEFAULTS.language,
        fontName: map.get('subtitle_font_name') || SUBTITLE_DEFAULTS.fontName,
        fontSize: parseInt(map.get('subtitle_font_size') || String(SUBTITLE_DEFAULTS.fontSize)),
        fontWeight: map.get('subtitle_font_weight') || SUBTITLE_DEFAULTS.fontWeight,
        fontColor: map.get('subtitle_font_color') || SUBTITLE_DEFAULTS.fontColor,
        highlightColor: map.get('subtitle_highlight_color') || SUBTITLE_DEFAULTS.highlightColor,
        strokeWidth: parseInt(map.get('subtitle_stroke_width') || String(SUBTITLE_DEFAULTS.strokeWidth)),
        strokeColor: map.get('subtitle_stroke_color') || SUBTITLE_DEFAULTS.strokeColor,
        backgroundColor: map.get('subtitle_background_color') || SUBTITLE_DEFAULTS.backgroundColor,
        position: map.get('subtitle_position') || SUBTITLE_DEFAULTS.position,
        yOffset: parseInt(map.get('subtitle_y_offset') || String(SUBTITLE_DEFAULTS.yOffset)),
        wordsPerSubtitle: parseInt(map.get('subtitle_words_per_subtitle') || String(SUBTITLE_DEFAULTS.wordsPerSubtitle)),
        enableAnimation: (map.get('subtitle_enable_animation') || 'true') === 'true',
      },
    }
    cachedAt = now
    return cached
  } catch (err) {
    console.warn('[AD_CONFIG] Failed to load, using defaults:', err instanceof Error ? err.message : err)
    return DEFAULTS
  }
}
