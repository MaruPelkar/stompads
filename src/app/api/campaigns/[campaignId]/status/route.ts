import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: campaign } = await supabase
    .from('campaigns')
    .select()
    .eq('id', params.campaignId)
    .eq('user_id', user.id)
    .single()

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  // Always fetch ads — sequential generation saves each immediately, so we can show partial progress
  const { data: ads } = await supabase
    .from('ads')
    .select()
    .eq('campaign_id', params.campaignId)

  return NextResponse.json({
    status: campaign.status,
    brandProfile: campaign.brand_profile,
    adCopy: campaign.ad_copy,
    brandAssets: campaign.brand_assets,
    ads: ads || [],
  })
}
