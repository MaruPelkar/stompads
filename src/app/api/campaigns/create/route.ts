import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

/**
 * POST /api/campaigns/create
 * Creates a campaign record, triggers server-side processing, returns immediately.
 * The /process route is called server-to-server (not from browser) to avoid connection drops.
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

  // Trigger processing server-to-server (not from browser)
  // Forward the auth cookies so the process route can authenticate
  const headerStore = await headers()
  const cookie = headerStore.get('cookie') || ''
  const origin = request.nextUrl.origin

  fetch(`${origin}/api/campaigns/${campaign.id}/process`, {
    method: 'POST',
    headers: { cookie },
  }).catch(err => {
    console.error(`[CREATE] Failed to trigger process for ${campaign.id}:`, err)
  })

  return NextResponse.json({ campaignId: campaign.id })
}
