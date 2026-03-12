import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dailyBudgetCents } = await request.json()
  if (!dailyBudgetCents || dailyBudgetCents < 500) {
    return NextResponse.json({ error: 'Minimum daily budget is $5' }, { status: 400 })
  }

  const serviceClient = await createServiceClient()
  const { data: campaign } = await serviceClient
    .from('campaigns')
    .select()
    .eq('id', params.campaignId)
    .eq('user_id', user.id)
    .single()

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Stompads Daily Ad Budget',
          description: `First day of ads for ${campaign.url}`,
        },
        unit_amount: dailyBudgetCents,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboard/success?campaign_id=${params.campaignId}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboard/cancel?campaign_id=${params.campaignId}`,
    metadata: {
      campaign_id: params.campaignId,
      user_id: user.id,
      daily_budget_cents: dailyBudgetCents.toString(),
    },
  })

  // Save budget to campaign
  await serviceClient
    .from('campaigns')
    .update({
      daily_budget: dailyBudgetCents,
      stripe_payment_intent_id: session.payment_intent as string,
      status: 'payment_pending',
    })
    .eq('id', params.campaignId)

  return NextResponse.json({ checkoutUrl: session.url })
}
