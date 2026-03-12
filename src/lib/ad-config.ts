import { createAdminClient } from '@/lib/supabase/server'

export interface AdConfig {
  videoModel: string
  videoDuration: number
  videoResolution: string
  videoAspectRatio: string
  subtitleEnabled: boolean
}

const DEFAULTS: AdConfig = {
  videoModel: 'fal-ai/sora-2/text-to-video',
  videoDuration: 4,
  videoResolution: '720p',
  videoAspectRatio: '9:16',
  subtitleEnabled: true,
}

let cached: AdConfig | null = null
let cachedAt = 0
const CACHE_TTL = 60_000 // 1 minute

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
    }
    cachedAt = now
    return cached
  } catch (err) {
    console.warn('[AD_CONFIG] Failed to load, using defaults:', err instanceof Error ? err.message : err)
    return DEFAULTS
  }
}
