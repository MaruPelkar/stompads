import { NextRequest, NextResponse } from 'next/server'

const META_API_BASE = 'https://graph.facebook.com/v19.0'

async function fetchMetaInsights(metaCampaignId: string, accessToken: string) {
  const fields = 'impressions,clicks,ctr,cpc,spend'
  const url = `${META_API_BASE}/${metaCampaignId}/ads?fields=id,name,insights{${fields}}&access_token=${accessToken}`
  const res = await fetch(url)
  const data = await res.json()
  return data.data || []
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Import here to avoid issues with cookie-based clients in cron context
  const { createAdminClient } = await import('@/lib/supabase/server')
  const supabase = createAdminClient()

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select()
    .eq('status', 'live')
    .not('meta_campaign_id', 'is', null)

  if (!campaigns || campaigns.length === 0) {
    return NextResponse.json({ synced: 0 })
  }

  let synced = 0

  for (const campaign of campaigns) {
    try {
      const metaAds = await fetchMetaInsights(
        campaign.meta_campaign_id!,
        process.env.META_ACCESS_TOKEN!
      )

      for (const metaAd of metaAds) {
        const insights = metaAd.insights?.data?.[0]
        if (!insights) continue

        const { data: ad } = await supabase
          .from('ads')
          .select()
          .eq('meta_ad_id', metaAd.id)
          .single()

        if (!ad) continue

        await supabase.from('metrics').insert({
          ad_id: ad.id,
          campaign_id: campaign.id,
          impressions: parseInt(insights.impressions || '0'),
          clicks: parseInt(insights.clicks || '0'),
          ctr: parseFloat(insights.ctr || '0'),
          cpc: parseFloat(insights.cpc || '0'),
          spend: parseFloat(insights.spend || '0'),
          recorded_at: new Date().toISOString(),
        })

        synced++
      }
    } catch (err) {
      console.error(`Failed to sync campaign ${campaign.id}:`, err)
    }
  }

  return NextResponse.json({ synced })
}
