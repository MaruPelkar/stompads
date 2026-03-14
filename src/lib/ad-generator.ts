import { createAdminClient } from '@/lib/supabase/server'
import { generateRawVideo, addSubtitles } from './fal-client'
import { generateVideoScripts } from './brand-profiler'
import { persistVideo } from './video-storage'
import { getAdConfig } from './ad-config'
import type { BrandProfile } from '@/types/database'
import { langfuse } from './langfuse'

function buildVideoPrompt(script: string, setting: string, brandProfile: BrandProfile): string {
  return `Create a 12-second UGC-style vertical video ad (9:16 aspect ratio).

Show an attractive, well-groomed, relatable person (20s-30s) ${setting}.
They are speaking this script directly into the camera, naturally and enthusiastically:

"${script}"

REQUIREMENTS:
- Film style: shot on iPhone, natural lighting, slightly shaky handheld feel
- The person uses natural hand gestures and animated facial expressions
- They look genuine and excited, like sharing a real discovery with a friend
- Product: ${brandProfile.product_name}
- Tone: ${brandProfile.tone}, authentic, trustworthy
- No text overlays, no captions, no logos, no watermarks, no end cards
- This should look indistinguishable from a real person's organic social media video`
}

/**
 * Generate 1 UGC video ad with full pipeline tracking.
 * Creates the ad row, generates video, persists to storage, burns subtitles.
 * Each step updates pipeline_step so failures can be diagnosed and retried.
 */
export async function generateCampaignAds(
  campaignId: string,
  brandProfile: BrandProfile,
): Promise<void> {
  const supabase = createAdminClient()
  const config = await getAdConfig()

  const trace = langfuse.trace({
    name: 'generate-campaign-ads',
    metadata: { campaignId, product: brandProfile.product_name },
  })

  // Generate script
  const videoScripts = await generateVideoScripts(brandProfile)
  const { script, setting } = videoScripts[0]
  const videoPrompt = buildVideoPrompt(script, setting, brandProfile)

  // Create ad row in DB first — so we have an ID for storage paths
  const { data: adRow, error: insertError } = await supabase.from('ads').insert({
    campaign_id: campaignId,
    type: 'video' as const,
    is_preview: true,
    asset_url: null,
    raw_asset_url: null,
    fal_request_id: null,
    status: 'generating' as const,
    prompt_used: videoPrompt,
    aspect_ratio: '9:16',
    placement: 'stories_reels',
    pipeline_step: 'video_generating',
    meta_ad_id: null,
    meta_creative_id: null,
  }).select().single()

  if (insertError || !adRow) {
    throw new Error(`Failed to create ad row: ${insertError?.message}`)
  }

  const adId = adRow.id

  try {
    // Step 1: Generate raw video via Fal
    const rawResult = await generateRawVideo(videoPrompt, trace.id)

    // Step 2: Persist raw video to Supabase Storage
    const rawUrl = await persistVideo(campaignId, adId, rawResult.url, 'raw')
    await supabase.from('ads').update({
      raw_asset_url: rawUrl,
      fal_request_id: rawResult.requestId,
      pipeline_step: 'video_ready',
    }).eq('id', adId)

    // Step 3: Subtitle burning (if enabled)
    if (config.subtitleEnabled) {
      await supabase.from('ads').update({ pipeline_step: 'subtitling' }).eq('id', adId)

      try {
        const subtitledFalUrl = await addSubtitles(rawUrl, trace.id)
        const finalUrl = await persistVideo(campaignId, adId, subtitledFalUrl, 'final')

        await supabase.from('ads').update({
          asset_url: finalUrl,
          pipeline_step: 'subtitled',
        }).eq('id', adId)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[SUBTITLE_FAILED] Ad ${adId}: ${msg}`)

        await supabase.from('ads').update({
          pipeline_step: 'subtitle_failed',
          status: 'failed' as const,
        }).eq('id', adId)

        trace.update({ output: { adId, error: msg, step: 'subtitle_failed' } })
        await langfuse.flushAsync()
        throw new Error(`Subtitle burning failed for ad ${adId}: ${msg}`)
      }
    } else {
      // No subtitles — raw video is the final asset
      await supabase.from('ads').update({
        asset_url: rawUrl,
        pipeline_step: 'subtitled',
      }).eq('id', adId)
    }

    // Step 4: Mark ready
    await supabase.from('ads').update({
      status: 'ready' as const,
      pipeline_step: 'ready',
    }).eq('id', adId)

    await supabase.from('campaigns').update({ status: 'ready' }).eq('id', campaignId)

    trace.update({ output: { adsGenerated: 1, adId } })
    await langfuse.flushAsync()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // Check if this is a subtitle failure (ad exists with raw video preserved)
    const { data: currentAd } = await supabase.from('ads').select('pipeline_step').eq('id', adId).single()
    if (currentAd?.pipeline_step !== 'subtitle_failed') {
      console.error(`[AD_GEN_FAIL]: ${msg}`)
      trace.update({ output: { adsGenerated: 0, error: msg } })
      await langfuse.flushAsync()
    }
    throw err
  }
}

/**
 * Retry subtitle burning for an ad stuck at subtitle_failed.
 * Uses the already-persisted raw_asset_url — no need to regenerate the video.
 */
export async function retrySubtitles(adId: string): Promise<void> {
  const supabase = createAdminClient()

  const { data: ad } = await supabase.from('ads').select().eq('id', adId).single()
  if (!ad) throw new Error('Ad not found')
  if (ad.pipeline_step !== 'subtitle_failed') {
    throw new Error(`Ad is not in subtitle_failed state (current: ${ad.pipeline_step})`)
  }
  if (!ad.raw_asset_url) {
    throw new Error('No raw video URL available for retry')
  }

  await supabase.from('ads').update({
    pipeline_step: 'subtitling',
    status: 'generating' as const,
  }).eq('id', adId)

  try {
    const subtitledFalUrl = await addSubtitles(ad.raw_asset_url)
    const finalUrl = await persistVideo(ad.campaign_id, adId, subtitledFalUrl, 'final')

    await supabase.from('ads').update({
      asset_url: finalUrl,
      pipeline_step: 'ready',
      status: 'ready' as const,
    }).eq('id', adId)

    // Check if all ads for this campaign are now ready
    const { data: allAds } = await supabase.from('ads')
      .select('status')
      .eq('campaign_id', ad.campaign_id)

    const allReady = allAds?.every(a => a.status === 'ready')
    if (allReady) {
      await supabase.from('campaigns').update({ status: 'ready' }).eq('id', ad.campaign_id)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await supabase.from('ads').update({
      pipeline_step: 'subtitle_failed',
      status: 'failed' as const,
    }).eq('id', adId)
    throw new Error(`Subtitle retry failed: ${msg}`)
  }
}
