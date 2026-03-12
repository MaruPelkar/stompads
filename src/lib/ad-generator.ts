import { createAdminClient } from '@/lib/supabase/server'
import { generateImageAd, generateVideoAd } from './fal-client'
import { generateVideoScript } from './brand-profiler'
import type { BrandProfile, BrandAssets, AdLibraryItem } from '@/types/database'
import { langfuse } from './langfuse'

export async function selectTemplate(category: string): Promise<AdLibraryItem | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('ad_library')
    .select()
    .ilike('category', `%${category}%`)
    .limit(1)
    .single()

  return data || null
}

function buildImagePrompt(
  brandProfile: BrandProfile,
  template: AdLibraryItem | null,
  aspectRatio: '1:1' | '9:16'
): string {
  const format = aspectRatio === '1:1'
    ? 'Create a square (1:1) social media ad image.'
    : 'Create a vertical (9:16) social media ad image for Stories and Reels.'

  return `${format}

Product: ${brandProfile.product_name}
Category: ${brandProfile.category}
Target audience: ${brandProfile.target_audience}
Key benefits: ${brandProfile.key_value_props.join(', ')}
Tone: ${brandProfile.tone}

The image should feature the product prominently with the brand's visual style.
Make it look like a professional social media ad — clean, eye-catching, native to the platform.
Include subtle brand elements but keep the focus on the product.
${template?.prompt ? `Style inspiration: ${template.prompt}` : ''}
Do NOT include any text overlays, logos, or watermarks — we add those separately.`
}

function buildVideoPrompt(script: string, brandProfile: BrandProfile): string {
  return `Create a UGC-style vertical video ad (9:16 aspect ratio).

Show an attractive, relatable person talking directly into the camera in a casual setting (home, cafe, or outdoors).
They are delivering this script naturally, as if sharing a genuine recommendation with a friend:

"${script}"

Product being discussed: ${brandProfile.product_name}
Tone: ${brandProfile.tone}, authentic, trustworthy
The person should be animated and enthusiastic but not over-the-top.
Film style: shot on iPhone, natural lighting, no studio setup.
No text overlays, no logos, no watermarks.`
}

export async function generateCampaignAds(
  campaignId: string,
  brandProfile: BrandProfile,
  brandAssets: BrandAssets,
): Promise<void> {
  const supabase = createAdminClient()
  const template = await selectTemplate(brandProfile.category)

  const trace = langfuse.trace({
    name: 'generate-campaign-ads',
    metadata: { campaignId, product: brandProfile.product_name },
  })

  // Collect reference images for the edit model
  const referenceImages: string[] = []
  if (brandAssets.ogImage) referenceImages.push(brandAssets.ogImage)
  if (brandAssets.logoUrl) referenceImages.push(brandAssets.logoUrl)
  referenceImages.push(...brandAssets.productImages.slice(0, 3))
  if (template?.visual_url) referenceImages.push(template.visual_url)

  // Generate video script via Claude
  const videoScript = await generateVideoScript(brandProfile)

  // Build prompts
  const squareImagePrompt = buildImagePrompt(brandProfile, template, '1:1')
  const verticalImagePrompt = buildImagePrompt(brandProfile, template, '9:16')
  const videoPrompt = buildVideoPrompt(videoScript, brandProfile)

  const refs = referenceImages.length > 0 ? referenceImages : undefined

  // Generate all 3 ads in parallel — use allSettled so one failure doesn't kill all
  const results = await Promise.allSettled([
    generateImageAd(squareImagePrompt, '1:1', refs, trace.id),
    generateImageAd(verticalImagePrompt, '9:16', refs, trace.id),
    generateVideoAd(videoPrompt, trace.id),
  ])

  const adConfigs = [
    { type: 'image' as const, aspectRatio: '1:1', placement: 'feed', prompt: squareImagePrompt },
    { type: 'image' as const, aspectRatio: '9:16', placement: 'stories_reels', prompt: verticalImagePrompt },
    { type: 'video' as const, aspectRatio: '9:16', placement: 'stories_reels', prompt: videoPrompt },
  ]

  const adsToInsert = []
  const errors: string[] = []

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    const config = adConfigs[i]

    if (result.status === 'fulfilled') {
      adsToInsert.push({
        campaign_id: campaignId,
        type: config.type,
        is_preview: true,
        asset_url: result.value.url,
        fal_request_id: result.value.requestId,
        status: 'ready' as const,
        prompt_used: config.prompt,
        aspect_ratio: config.aspectRatio,
        placement: config.placement,
        meta_ad_id: null,
        meta_creative_id: null,
      })
    } else {
      const msg = result.reason instanceof Error ? result.reason.message : String(result.reason)
      console.error(`[AD_GEN_PARTIAL_FAIL] ${config.type} ${config.aspectRatio}: ${msg}`)
      errors.push(`${config.type} ${config.aspectRatio}: ${msg}`)
    }
  }

  // Insert whatever succeeded
  if (adsToInsert.length > 0) {
    await supabase.from('ads').insert(adsToInsert)
  }

  // If ALL failed, throw so the route returns an error
  if (adsToInsert.length === 0) {
    trace.update({ output: { adsGenerated: 0, errors } })
    await langfuse.flushAsync()
    throw new Error(`All ad generations failed: ${errors.join('; ')}`)
  }

  await supabase
    .from('campaigns')
    .update({ status: 'ready' })
    .eq('id', campaignId)

  trace.update({ output: { adsGenerated: adsToInsert.length, failed: errors.length, errors } })
  await langfuse.flushAsync()
}
