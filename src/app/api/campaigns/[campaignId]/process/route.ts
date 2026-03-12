import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { scrapeUrl } from '@/lib/scraper'
import { buildBrandProfile } from '@/lib/brand-profiler'
import { findCompetitorAds } from '@/lib/competitor-research'
import { generateCampaignAds } from '@/lib/ad-generator'
import { storeBrandAssets } from '@/lib/asset-storage'
import { langfuse } from '@/lib/langfuse'
import type { Json } from '@/types/database'

// Allow up to 300s on Vercel Pro (or 60s on hobby)
export const maxDuration = 300

/**
 * POST /api/campaigns/[campaignId]/process
 * Heavy processing: scrape → profile → generate ads.
 * Called by frontend after create returns.
 * Returns when all processing is complete (or fails).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createAdminClient()

  const { data: campaign } = await adminClient
    .from('campaigns')
    .select()
    .eq('id', params.campaignId)
    .eq('user_id', user.id)
    .single()

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  if (campaign.status !== 'generating') {
    return NextResponse.json({ error: 'Campaign already processed', code: 'ALREADY_PROCESSED' }, { status: 400 })
  }

  const trace = langfuse.trace({
    name: 'campaign-processing-pipeline',
    userId: user.id,
    sessionId: params.campaignId,
    metadata: { url: campaign.url },
  })

  async function fail(code: string, message: string) {
    console.error(`[${code}]`, message)
    await adminClient.from('campaigns').update({ status: 'draft' as const }).eq('id', params.campaignId)
    trace.update({ metadata: { error: message, code } })
    await langfuse.flushAsync()
  }

  // Step 1: Scrape
  let scrape
  try {
    scrape = await scrapeUrl(campaign.url, trace.id)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Scraping failed'
    await fail('SCRAPE_FAILED', msg)
    return NextResponse.json({ error: `Scraping failed: ${msg}`, code: 'SCRAPE_FAILED' }, { status: 500 })
  }

  // Step 2: Brand profile + ad copy
  let brandProfile, adCopy
  try {
    const result = await buildBrandProfile(scrape, campaign.url)
    brandProfile = result.brandProfile
    adCopy = result.adCopy
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Profiling failed'
    await fail('PROFILE_FAILED', msg)
    return NextResponse.json({ error: `Brand profiling failed: ${msg}`, code: 'PROFILE_FAILED' }, { status: 500 })
  }

  // Step 3: Competitor research (non-fatal)
  try {
    const competitorAds = await findCompetitorAds(brandProfile.category, brandProfile.key_value_props, trace.id)
    brandProfile.competitor_ad_examples = competitorAds.map(a => a.ad_creative_body || '').filter(Boolean)
  } catch (err) {
    console.warn('[COMPETITOR_RESEARCH_FAILED]', err instanceof Error ? err.message : err)
  }

  // Step 4: Store brand assets
  let storedAssets = scrape.brandAssets
  try {
    storedAssets = await storeBrandAssets(params.campaignId, scrape.brandAssets)
  } catch (err) {
    console.warn('[ASSET_STORAGE_FAILED]', err instanceof Error ? err.message : err)
  }

  // Step 5: Save profile + assets + copy
  try {
    const { error: updateError } = await adminClient
      .from('campaigns')
      .update({
        brand_profile: brandProfile as unknown as Json,
        brand_assets: storedAssets as unknown as Json,
        ad_copy: adCopy as unknown as Json,
        status: 'generating' as const,
      })
      .eq('id', params.campaignId)

    if (updateError) throw new Error(updateError.message)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'DB update failed'
    await fail('CAMPAIGN_UPDATE_FAILED', msg)
    return NextResponse.json({ error: `Failed to save profile: ${msg}`, code: 'CAMPAIGN_UPDATE_FAILED' }, { status: 500 })
  }

  // Step 6: Generate ads
  try {
    await generateCampaignAds(params.campaignId, brandProfile)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ad generation failed'
    await fail('AD_GENERATION_FAILED', msg)
    return NextResponse.json({ error: `Ad generation failed: ${msg}`, code: 'AD_GENERATION_FAILED' }, { status: 500 })
  }

  // Fetch final ads
  const { data: ads } = await adminClient
    .from('ads')
    .select()
    .eq('campaign_id', params.campaignId)

  trace.update({ output: { campaignId: params.campaignId, product: brandProfile.product_name, adsGenerated: ads?.length } })
  await langfuse.flushAsync()

  return NextResponse.json({
    status: 'ready',
    brandProfile,
    adCopy,
    brandAssets: storedAssets,
    ads: ads || [],
  })
}
