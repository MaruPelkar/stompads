import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  createCampaignWithBudget,
  createAdSet,
  createVideoAdCreative,
  createAd,
  uploadAdImage,
  createImageAdCreative,
} from '@/lib/meta-ads'
import type { BrandProfile, AdCopy } from '@/types/database'

export const maxDuration = 120

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

  const headline = adCopy?.headline || brandProfile.product_name
  const primaryText = adCopy?.primaryText || brandProfile.key_value_props.slice(0, 2).join('. ')
  const description = adCopy?.description || 'Learn more'

  try {
    // 10% platform commission — user pays $10, Meta gets $9
    const adSpendCents = Math.round(campaign.daily_budget! * 0.9)

    // Convert USD cents to INR paisa
    const USD_TO_INR = 85
    const budgetInAccountCurrency = adSpendCents * USD_TO_INR

    // 1 campaign with campaign-level budget control (reuse if exists)
    let metaCampaignId = campaign.meta_campaign_id
    if (!metaCampaignId) {
      metaCampaignId = await createCampaignWithBudget(
        `Stompads - ${brandProfile.product_name}`,
        budgetInAccountCurrency,
      )
    }

    // 1 ad set (no budget — controlled at campaign level)
    let adSetId = campaign.meta_adset_id
    if (!adSetId) {
      adSetId = await createAdSet(metaCampaignId, `${brandProfile.product_name} - Ads`)
    }

    // Save Meta IDs
    await serviceClient
      .from('campaigns')
      .update({ meta_campaign_id: metaCampaignId, meta_adset_id: adSetId })
      .eq('id', params.campaignId)

    // 2 ads in the single ad set
    for (const ad of ads) {
      if (!ad.asset_url) continue
      if (ad.meta_ad_id) continue // skip already pushed

      let creativeId: string

      if (ad.type === 'video') {
        creativeId = await createVideoAdCreative(
          ad.asset_url, headline, primaryText, description, campaign.url
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
