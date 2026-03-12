import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scrapeUrl } from '@/lib/scraper'
import { buildBrandProfile } from '@/lib/brand-profiler'
import { findCompetitorAds } from '@/lib/competitor-research'
import { generateCampaignAds } from '@/lib/ad-generator'
import { langfuse } from '@/lib/langfuse'
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

  const trace = langfuse.trace({
    name: 'campaign-creation-pipeline-v2',
    userId: user.id,
    metadata: { url },
  })

  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .insert({
      user_id: user.id,
      url,
      status: 'generating' as const,
      brand_profile: null,
      brand_assets: null,
      ad_copy: null,
      daily_budget: null,
      meta_campaign_id: null,
      meta_adset_id: null,
      stripe_payment_intent_id: null,
    })
    .select()
    .single()

  if (campaignError || !campaign) {
    trace.update({ metadata: { error: 'Failed to create campaign' } })
    await langfuse.flushAsync()
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }

  trace.update({ sessionId: campaign.id })

  try {
    // 1. Scrape site + extract brand assets
    const scrape = await scrapeUrl(url, trace.id)

    // 2. Build brand profile + generate ad copy
    const { brandProfile, adCopy } = await buildBrandProfile(scrape, url)

    // 3. Competitor research (non-fatal)
    const competitorAds = await findCompetitorAds(
      brandProfile.category,
      brandProfile.key_value_props,
      trace.id
    )
    brandProfile.competitor_ad_examples = competitorAds.map(a => a.ad_creative_body || '').filter(Boolean)

    // 4. Save profile + assets + copy to campaign
    await supabase
      .from('campaigns')
      .update({
        brand_profile: brandProfile as unknown as Json,
        brand_assets: scrape.brandAssets as unknown as Json,
        ad_copy: adCopy as unknown as Json,
        status: 'generating' as const,
      })
      .eq('id', campaign.id)

    // 5. Generate all 3 ads (marks campaign as 'ready' when done)
    await generateCampaignAds(campaign.id, brandProfile, scrape.brandAssets)

    // 6. Fetch generated ads to return to client
    const { data: ads } = await supabase
      .from('ads')
      .select()
      .eq('campaign_id', campaign.id)

    trace.update({
      output: { campaignId: campaign.id, product: brandProfile.product_name, adsGenerated: ads?.length },
    })
    await langfuse.flushAsync()

    return NextResponse.json({
      campaignId: campaign.id,
      brandProfile,
      adCopy,
      brandAssets: scrape.brandAssets,
      ads: ads || [],
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    const errorStack = err instanceof Error ? err.stack : undefined
    console.error('Campaign creation failed:', errorMessage, errorStack)

    await supabase
      .from('campaigns')
      .update({ status: 'draft' as const })
      .eq('id', campaign.id)

    trace.update({
      metadata: { error: errorMessage },
    })
    await langfuse.flushAsync()

    return NextResponse.json({ error: `Failed to analyze URL: ${errorMessage}` }, { status: 500 })
  }
}
