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
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_FAILED' }, { status: 401 })
  }

  const { url } = await request.json()
  if (!url) {
    return NextResponse.json({ error: 'URL is required', code: 'MISSING_URL' }, { status: 400 })
  }

  const trace = langfuse.trace({
    name: 'campaign-creation-pipeline-v2',
    userId: user.id,
    metadata: { url },
  })

  // Step 0: Create campaign
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
    const msg = campaignError?.message || 'Unknown DB error'
    console.error('[CAMPAIGN_CREATE_FAILED]', msg)
    trace.update({ metadata: { error: msg, code: 'CAMPAIGN_CREATE_FAILED' } })
    await langfuse.flushAsync()
    return NextResponse.json({ error: `Failed to create campaign: ${msg}`, code: 'CAMPAIGN_CREATE_FAILED' }, { status: 500 })
  }

  trace.update({ sessionId: campaign.id })

  async function fail(code: string, message: string) {
    console.error(`[${code}]`, message)
    await supabase.from('campaigns').update({ status: 'draft' as const }).eq('id', campaign!.id)
    trace.update({ metadata: { error: message, code } })
    await langfuse.flushAsync()
  }

  // Step 1: Scrape
  let scrape
  try {
    scrape = await scrapeUrl(url, trace.id)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown scraping error'
    await fail('SCRAPE_FAILED', msg)
    return NextResponse.json({ error: `Scraping failed for ${url}: ${msg}`, code: 'SCRAPE_FAILED', campaignId: campaign.id }, { status: 500 })
  }

  // Step 2: Brand profile + ad copy
  let brandProfile, adCopy
  try {
    const result = await buildBrandProfile(scrape, url)
    brandProfile = result.brandProfile
    adCopy = result.adCopy
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown profiling error'
    await fail('PROFILE_FAILED', msg)
    return NextResponse.json({ error: `Brand profiling failed: ${msg}`, code: 'PROFILE_FAILED', campaignId: campaign.id }, { status: 500 })
  }

  // Step 3: Competitor research (non-fatal)
  try {
    const competitorAds = await findCompetitorAds(
      brandProfile.category,
      brandProfile.key_value_props,
      trace.id
    )
    brandProfile.competitor_ad_examples = competitorAds.map(a => a.ad_creative_body || '').filter(Boolean)
  } catch (err) {
    console.warn('[COMPETITOR_RESEARCH_FAILED]', err instanceof Error ? err.message : err)
  }

  // Step 4: Save profile + assets + copy
  try {
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({
        brand_profile: brandProfile as unknown as Json,
        brand_assets: scrape.brandAssets as unknown as Json,
        ad_copy: adCopy as unknown as Json,
        status: 'generating' as const,
      })
      .eq('id', campaign.id)

    if (updateError) throw new Error(updateError.message)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown DB error'
    await fail('CAMPAIGN_UPDATE_FAILED', msg)
    return NextResponse.json({ error: `Failed to save brand profile: ${msg}`, code: 'CAMPAIGN_UPDATE_FAILED', campaignId: campaign.id }, { status: 500 })
  }

  // Step 5: Generate ads
  try {
    await generateCampaignAds(campaign.id, brandProfile, scrape.brandAssets)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown generation error'
    await fail('AD_GENERATION_FAILED', msg)
    return NextResponse.json({ error: `Ad generation failed: ${msg}`, code: 'AD_GENERATION_FAILED', campaignId: campaign.id }, { status: 500 })
  }

  // Step 6: Fetch generated ads
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
}
