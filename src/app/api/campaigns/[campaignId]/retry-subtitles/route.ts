import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { retrySubtitles } from '@/lib/ad-generator'

export const maxDuration = 300

export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership
  const { data: campaign } = await supabase
    .from('campaigns')
    .select()
    .eq('id', params.campaignId)
    .eq('user_id', user.id)
    .single()

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  const { adId } = await request.json()
  if (!adId) return NextResponse.json({ error: 'adId is required' }, { status: 400 })

  try {
    await retrySubtitles(adId)
    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
