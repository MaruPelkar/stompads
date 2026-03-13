import { createAdminClient } from '@/lib/supabase/server'
import { generateVideoAd } from './fal-client'
import { generateVideoScripts } from './brand-profiler'
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
 * Generate 1 UGC video ad for Instagram Stories and Reels.
 * 1 campaign → 1 ad set → 1 ad
 */
export async function generateCampaignAds(
  campaignId: string,
  brandProfile: BrandProfile,
): Promise<void> {
  const supabase = createAdminClient()

  const trace = langfuse.trace({
    name: 'generate-campaign-ads',
    metadata: { campaignId, product: brandProfile.product_name },
  })

  // Generate 1 video script (takes first from the pair)
  const videoScripts = await generateVideoScripts(brandProfile)
  const { script, setting } = videoScripts[0]
  const videoPrompt = buildVideoPrompt(script, setting, brandProfile)

  try {
    const result = await generateVideoAd(videoPrompt, trace.id)

    await supabase.from('ads').insert({
      campaign_id: campaignId,
      type: 'video' as const,
      is_preview: true,
      asset_url: result.url,
      fal_request_id: result.requestId,
      status: 'ready' as const,
      prompt_used: videoPrompt,
      aspect_ratio: '9:16',
      placement: 'stories_reels',
      meta_ad_id: null,
      meta_creative_id: null,
    })

    await supabase
      .from('campaigns')
      .update({ status: 'ready' })
      .eq('id', campaignId)

    trace.update({ output: { adsGenerated: 1 } })
    await langfuse.flushAsync()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[AD_GEN_FAIL]: ${msg}`)
    trace.update({ output: { adsGenerated: 0, error: msg } })
    await langfuse.flushAsync()
    throw new Error(`Video generation failed: ${msg}`)
  }
}
