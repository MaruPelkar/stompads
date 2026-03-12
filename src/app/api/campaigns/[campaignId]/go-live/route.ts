import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  createCampaign,
  createAdSet,
  uploadAdImage,
  createImageAdCreative,
  createVideoAdCreative,
  createAd,
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

  const headline = adCopy?.headline || brandProfile.product_name
  const primaryText = adCopy?.primaryText || brandProfile.key_value_props.slice(0, 2).join('. ')
  const description = adCopy?.description || 'Learn more'

  try {
    // Reuse existing campaign or create new one
    let metaCampaignId = campaign.meta_campaign_id
    if (!metaCampaignId) {
      metaCampaignId = await createCampaign(`Stompads - ${brandProfile.product_name}`)
    }

    // Video only — all budget goes to Stories & Reels
    const storiesAdSetId = await createAdSet({
      campaignId: metaCampaignId,
      name: `${brandProfile.product_name} - Stories & Reels`,
      dailyBudgetCents: campaign.daily_budget!,
      placements: 'stories_reels',
    })

    await serviceClient
      .from('campaigns')
      .update({ meta_campaign_id: metaCampaignId, meta_adset_id: storiesAdSetId })
      .eq('id', params.campaignId)

    // All ads go to stories/reels ad set (video only for now)
    for (const ad of ads) {
      if (!ad.asset_url) continue

      let creativeId: string

      if (ad.type === 'video') {
        creativeId = await createVideoAdCreative(
          ad.asset_url, headline, primaryText, description, campaign.url
        )
      } else {
        // Image ads (not generated for now, but handle gracefully if they exist)
        const imageHash = await uploadAdImage(ad.asset_url)
        creativeId = await createImageAdCreative(
          imageHash, headline, primaryText, description, campaign.url
        )
      }

      const metaAdId = await createAd(storiesAdSetId, creativeId, `${brandProfile.product_name} - ${ad.type} ${ad.aspect_ratio}`)

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
    console.error('Meta campaign launch error:', err)
    return NextResponse.json({ error: 'Failed to launch Meta campaign' }, { status: 500 })
  }
}
