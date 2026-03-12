import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  createCampaign,
  createAdSet,
  uploadAdImage,
  createImageAdCreative,
  createVideoAdCreative,
  createAd,
  buildTargeting,
} from '@/lib/meta-ads'
import type { BrandProfile } from '@/types/database'

const PAGE_ID = process.env.META_PAGE_ID!

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
  const headline = `${brandProfile.product_name} — ${brandProfile.key_value_props[0]}`
  const body = brandProfile.key_value_props.slice(0, 2).join('. ')
  const targeting = buildTargeting()

  try {
    const metaCampaignId = await createCampaign(
      `Stompads - ${brandProfile.product_name}`
    )

    const metaAdSetId = await createAdSet(
      metaCampaignId,
      `Stompads AdSet - ${brandProfile.category}`,
      campaign.daily_budget!,
      targeting
    )

    await serviceClient
      .from('campaigns')
      .update({ meta_campaign_id: metaCampaignId, meta_adset_id: metaAdSetId })
      .eq('id', params.campaignId)

    for (const ad of ads) {
      if (!ad.asset_url) continue

      let creativeId: string

      if (ad.type === 'image') {
        const imageHash = await uploadAdImage(ad.asset_url)
        creativeId = await createImageAdCreative(
          imageHash, headline, body, campaign.url, PAGE_ID
        )
      } else {
        creativeId = await createVideoAdCreative(
          ad.asset_url, headline, body, campaign.url, PAGE_ID
        )
      }

      const metaAdId = await createAd(metaAdSetId, creativeId, `Stompads Ad ${ad.id}`)

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
