import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const preview = request.nextUrl.searchParams.get('preview') === 'true'

  let query = supabase
    .from('ads')
    .select()
    .eq('campaign_id', params.campaignId)

  if (preview) {
    query = query.eq('is_preview', true)
  }

  const { data: ads } = await query

  return NextResponse.json({ ads: ads || [] })
}
