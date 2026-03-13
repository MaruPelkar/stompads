import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  createCampaign,
  createAdSet,
  createVideoAdCreative,
  createAd,
  uploadAdImage,
  createImageAdCreative,
} from '@/lib/meta-ads'
import type { BrandProfile, AdCopy } from '@/types/database'

export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = await createServiceClient()

  const { data: campaign } = await serviceClient
    .from('campaigns')
    .select()
    .eq('id', params.campaignId)
    .eq('user_id', user.id)
    .single()

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  if (campaign.status !== 'ready') {
    return NextResponse.json({ error: 'Campaign is not ready to go live' }, { status: 400 })
  }

  const { data: ads } = await serviceClient
    .from('ads')
    .select()
    .eq('campaign_id', params.campaignId)
    .eq('status', 'ready')

  if (!ads || ads.length === 0) {
    return NextResponse.json({ error: 'No ready ads found' }, { status: 400 })
  }

  const brandProfile = campaign.brand_profile as unknown as BrandProfile
  const adCopy = campaign.ad_copy as unknown as AdCopy
  const brandAssets = campaign.brand_assets as unknown as { ogImage?: string; logoUrl?: string; productImages?: string[] } | null

  const headline = adCopy?.headline || brandProfile.product_name
  const primaryText = adCopy?.primaryText || brandProfile.key_value_props.slice(0, 2).join('. ')
  const description = adCopy?.description || 'Learn more'

  try {
    // 1 campaign per Stompads campaign (reuse if exists)
    let metaCampaignId = campaign.meta_campaign_id
    if (!metaCampaignId) {
      metaCampaignId = await createCampaign(`Stompads - ${brandProfile.product_name}`)
    }

    // Convert USD cents to INR paisa
    const USD_TO_INR = 85
    const budgetInAccountCurrency = campaign.daily_budget! * USD_TO_INR

    // 1 ad set per campaign — Advantage+ targeting (Meta optimizes everything)
    let adSetId = campaign.meta_adset_id

    if (!adSetId) {
      adSetId = await createAdSet(
        metaCampaignId,
        `${brandProfile.product_name} - Advantage+`,
        budgetInAccountCurrency,
      )
    }

    // Save Meta IDs
    await serviceClient
      .from('campaigns')
      .update({ meta_campaign_id: metaCampaignId, meta_adset_id: adSetId })
      .eq('id', params.campaignId)

    // 2 ads in the single ad set
    for (const ad of ads) {
      if (!ad.asset_url) continue
      // Skip if already has a meta_ad_id (avoid duplicates on retry)
      if (ad.meta_ad_id) continue

      let creativeId: string

      if (ad.type === 'video') {
        const thumbnailUrl = brandAssets?.ogImage || brandAssets?.logoUrl || brandAssets?.productImages?.[0] || undefined
        creativeId = await createVideoAdCreative(
          ad.asset_url, headline, primaryText, description, campaign.url, thumbnailUrl
        )
      } else {
        const imageHash = await uploadAdImage(ad.asset_url)
        creativeId = await createImageAdCreative(
          imageHash, headline, primaryText, description, campaign.url
        )
      }

      const metaAdId = await createAd(adSetId, creativeId, `${brandProfile.product_name} - ${ad.type} ${ad.aspect_ratio}`)

      await serviceClient
        .from('ads')
        .update({ meta_ad_id: metaAdId, meta_creative_id: creativeId, status: 'live' })
        .eq('id', ad.id)
    }

    await serviceClient
      .from('campaigns')
      .update({ status: 'live' })
      .eq('id', params.campaignId)

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Meta campaign launch error:', msg)
    return NextResponse.json({ error: `Failed to launch Meta campaign: ${msg}` }, { status: 500 })
  }
}
