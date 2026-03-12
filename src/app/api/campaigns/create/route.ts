import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scrapeUrl } from '@/lib/scraper'
import { buildBrandProfile } from '@/lib/brand-profiler'
import { findCompetitorAds } from '@/lib/competitor-research'
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

  // Create a single trace for the entire campaign creation pipeline
  const trace = langfuse.trace({
    name: 'campaign-creation-pipeline',
    userId: user.id,
    metadata: { url },
  })

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
    trace.update({ metadata: { error: 'Failed to create campaign' } })
    await langfuse.flushAsync()
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }

  trace.update({ sessionId: campaign.id })

  try {
    // Scrape and profile — pass trace ID so child spans nest under this trace
    const scrape = await scrapeUrl(url, trace.id)
    const brandProfile = await buildBrandProfile(scrape, url)
    // brandProfile trace is standalone but linked via timing

    // Competitor research (non-fatal if it fails)
    const competitorAds = await findCompetitorAds(
      brandProfile.category,
      brandProfile.key_value_props,
      trace.id
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

    trace.update({
      output: { campaignId: campaign.id, category: brandProfile.category, product: brandProfile.product_name },
    })
    await langfuse.flushAsync()

    return NextResponse.json({ campaignId: campaign.id, brandProfile })
  } catch (err) {
    await supabase
      .from('campaigns')
      .update({ status: 'draft' as const })
      .eq('id', campaign.id)

    trace.update({
      metadata: { error: err instanceof Error ? err.message : 'Unknown error' },
    })
    await langfuse.flushAsync()

    return NextResponse.json({ error: 'Failed to analyze URL' }, { status: 500 })
  }
}
