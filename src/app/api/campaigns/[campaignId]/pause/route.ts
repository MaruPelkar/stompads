import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { pauseCampaign, resumeCampaign } from '@/lib/meta-ads'

export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await request.json() as { action: 'pause' | 'resume' }

  const serviceClient = await createServiceClient()
  const { data: campaign } = await serviceClient
    .from('campaigns')
    .select()
    .eq('id', params.campaignId)
    .eq('user_id', user.id)
    .single()

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  if (!campaign.meta_campaign_id) {
    return NextResponse.json({ error: 'Campaign has no Meta campaign' }, { status: 400 })
  }

  try {
    if (action === 'pause') {
      await pauseCampaign(campaign.meta_campaign_id)
      await serviceClient.from('campaigns').update({ status: 'paused' }).eq('id', params.campaignId)
    } else {
      await resumeCampaign(campaign.meta_campaign_id)
      await serviceClient.from('campaigns').update({ status: 'live' }).eq('id', params.campaignId)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Failed to ${action} campaign: ${msg}` }, { status: 500 })
  }
}
