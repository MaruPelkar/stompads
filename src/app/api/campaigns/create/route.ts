import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scrapeUrl } from '@/lib/scraper'
import { buildBrandProfile } from '@/lib/brand-profiler'
import { findCompetitorAds } from '@/lib/competitor-research'
import type { Json } from '@/types/database'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { url } = await request.json()
  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  // Create campaign in generating state
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .insert({
      user_id: user.id,
      url,
      status: 'generating' as const,
      brand_profile: null,
      daily_budget: null,
      meta_campaign_id: null,
      meta_adset_id: null,
      stripe_payment_intent_id: null,
    })
    .select()
    .single()

  if (campaignError || !campaign) {
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }

  try {
    // Scrape and profile
    const scrape = await scrapeUrl(url)
    const brandProfile = await buildBrandProfile(scrape, url)

    // Competitor research (non-fatal if it fails)
    const competitorAds = await findCompetitorAds(
      brandProfile.category,
      brandProfile.key_value_props
    )
    brandProfile.competitor_ad_examples = competitorAds.map(a => a.ad_creative_body || '').filter(Boolean)

    // Update campaign with brand profile
    await supabase
      .from('campaigns')
      .update({
        brand_profile: brandProfile as unknown as Json,
        status: 'preview_ready' as const,
      })
      .eq('id', campaign.id)

    return NextResponse.json({ campaignId: campaign.id, brandProfile })
  } catch {
    await supabase
      .from('campaigns')
      .update({ status: 'draft' as const })
      .eq('id', campaign.id)

    return NextResponse.json({ error: 'Failed to analyze URL' }, { status: 500 })
  }
}
