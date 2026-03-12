import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generatePreviewAds } from '@/lib/ad-generator'
import type { BrandProfile } from '@/types/database'

export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = await createServiceClient()
  const { data: campaign } = await serviceClient
    .from('campaigns')
    .select()
    .eq('id', params.campaignId)
    .eq('user_id', user.id)
    .single()

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  if (!campaign.brand_profile) return NextResponse.json({ error: 'Brand profile missing' }, { status: 400 })

  await generatePreviewAds(campaign.id, campaign.brand_profile as unknown as BrandProfile)

  return NextResponse.json({ success: true })
}
