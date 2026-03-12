import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/campaigns/create
 * Creates a campaign record and returns immediately.
 * Frontend then calls /api/campaigns/[id]/process to do the heavy work.
 */
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
    return NextResponse.json({ error: `Failed to create campaign: ${msg}`, code: 'CAMPAIGN_CREATE_FAILED' }, { status: 500 })
  }

  return NextResponse.json({ campaignId: campaign.id })
}
