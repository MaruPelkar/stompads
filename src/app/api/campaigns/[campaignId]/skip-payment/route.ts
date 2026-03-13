import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * POST /api/campaigns/[campaignId]/skip-payment
 * Admin-only: sets campaign to 'ready' with a test budget, skipping Stripe.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { dailyBudgetCents } = await request.json().catch(() => ({ dailyBudgetCents: 1000 }))

  const serviceClient = await createServiceClient()
  const { error } = await serviceClient
    .from('campaigns')
    .update({
      status: 'ready',
      daily_budget: dailyBudgetCents || 1000,
    })
    .eq('id', params.campaignId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
