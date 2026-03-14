import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
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

  const db = createAdminClient()

  const { data: campaign } = await db
    .from('campaigns')
    .select()
    .eq('id', params.campaignId)
    .eq('user_id', user.id)
    .single()

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  if (campaign.status !== 'ready') {
    return NextResponse.json({ error: 'Campaign is not ready to go live' }, { status: 400 })
  }

  // Get only the latest ready ad (1 campaign = 1 ad)
  const { data: allAds } = await db
    .from('ads')
    .select()
    .eq('campaign_id', params.campaignId)
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(1)

  if (!allAds || allAds.length === 0) {
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

    // --- Resumable: reuse existing Meta campaign or create new ---
    let metaCampaignId = campaign.meta_campaign_id
    if (!metaCampaignId) {
      metaCampaignId = await createCampaignWithBudget(
        `Stompads - ${brandProfile.product_name}`,
        budgetInAccountCurrency,
      )
      await db.from('campaigns')
        .update({ meta_campaign_id: metaCampaignId })
        .eq('id', params.campaignId)
    }

    // --- Resumable: reuse existing ad set or create new ---
    let adSetId = campaign.meta_adset_id
    if (!adSetId) {
      adSetId = await createAdSet(metaCampaignId, `${brandProfile.product_name} - Ads`)
      await db.from('campaigns')
        .update({ meta_adset_id: adSetId })
        .eq('id', params.campaignId)
    }

    // --- Resumable: skip ads that already have a meta_ad_id ---
    for (const ad of allAds) {
      if (!ad.asset_url) continue
      if (ad.meta_ad_id) continue

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

      // Save creative ID immediately — so retry doesn't recreate it
      await db.from('ads')
        .update({ meta_creative_id: creativeId })
        .eq('id', ad.id)

      const metaAdId = await createAd(
        adSetId, creativeId,
        `${brandProfile.product_name} - ${ad.type} ${ad.aspect_ratio}`
      )

      // Save ad ID immediately
      await db.from('ads')
        .update({ meta_ad_id: metaAdId, status: 'live' })
        .eq('id', ad.id)
    }

    await db.from('campaigns')
      .update({ status: 'live' })
      .eq('id', params.campaignId)

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Meta campaign launch error:', msg)
    return NextResponse.json({ error: `Failed to launch Meta campaign: ${msg}` }, { status: 500 })
  }
}
