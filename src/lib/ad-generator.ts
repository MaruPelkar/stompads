import { createAdminClient } from '@/lib/supabase/server'
import { generateImageAd, generateVideoAd } from './fal-client'
import type { BrandProfile, AdLibraryItem } from '@/types/database'

export function buildAdPrompt(template: AdLibraryItem | null, brandProfile: BrandProfile, type: 'image' | 'video'): string {
  const base = template?.prompt || ''
  const style = type === 'video'
    ? 'Create a 12-second UGC-style vertical video ad. Show a real person talking directly into the camera, sharing how this product changed their life. Make it feel like a genuine testimonial filmed on a phone.'
    : 'Create a square UGC-style image ad.'

  return `${style}
Product: ${brandProfile.product_name}
Category: ${brandProfile.category}
Target audience: ${brandProfile.target_audience}
Key benefits: ${brandProfile.key_value_props.join(', ')}
Tone: ${brandProfile.tone}
${base ? `Style inspiration: ${base}` : ''}
Make it feel authentic, relatable, and native to social media. No logos or text overlays needed.`
}

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

export async function generatePreviewAds(
  campaignId: string,
  brandProfile: BrandProfile,
  ogImage?: string
): Promise<void> {
  const supabase = createAdminClient()
  const template = await selectTemplate(brandProfile.category)

  // Collect reference images for the image ad (OG image from site, template visual)
  const referenceImages: string[] = []
  if (ogImage) referenceImages.push(ogImage)
  if (template?.visual_url) referenceImages.push(template.visual_url)

  // Generate 1 image + 1 video preview in parallel
  const imagePrompt = buildAdPrompt(template, brandProfile, 'image')
  const videoPrompt = buildAdPrompt(template, brandProfile, 'video')

  const [imageResult, videoResult] = await Promise.all([
    generateImageAd(imagePrompt, referenceImages.length > 0 ? referenceImages : undefined),
    generateVideoAd(videoPrompt),
  ])

  await supabase.from('ads').insert([
    {
      campaign_id: campaignId,
      type: 'image' as const,
      is_preview: true,
      asset_url: imageResult.url,
      fal_request_id: imageResult.requestId,
      status: 'ready' as const,
      prompt_used: imagePrompt,
      meta_ad_id: null,
      meta_creative_id: null,
    },
    {
      campaign_id: campaignId,
      type: 'video' as const,
      is_preview: true,
      asset_url: videoResult.url,
      fal_request_id: videoResult.requestId,
      status: 'ready' as const,
      prompt_used: videoPrompt,
      meta_ad_id: null,
      meta_creative_id: null,
    },
  ])
}

export async function generateFullCampaignAds(
  campaignId: string,
  brandProfile: BrandProfile,
  ogImage?: string
): Promise<void> {
  const supabase = createAdminClient()
  const template = await selectTemplate(brandProfile.category)

  const referenceImages: string[] = []
  if (ogImage) referenceImages.push(ogImage)
  if (template?.visual_url) referenceImages.push(template.visual_url)

  // Generate 4 more images + 4 more videos
  const generations = [
    ...Array(4).fill('image'),
    ...Array(4).fill('video'),
  ] as ('image' | 'video')[]

  await Promise.all(
    generations.map(async (type) => {
      const prompt = buildAdPrompt(template, brandProfile, type)
      const result = type === 'image'
        ? await generateImageAd(prompt, referenceImages.length > 0 ? referenceImages : undefined)
        : await generateVideoAd(prompt)

      await supabase.from('ads').insert({
        campaign_id: campaignId,
        type,
        is_preview: false,
        asset_url: result.url,
        fal_request_id: result.requestId,
        status: 'ready' as const,
        prompt_used: prompt,
        meta_ad_id: null,
        meta_creative_id: null,
      })
    })
  )

  await supabase
    .from('campaigns')
    .update({ status: 'ready' })
    .eq('id', campaignId)
}
