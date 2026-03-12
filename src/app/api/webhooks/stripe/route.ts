import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { campaign_id } = session.metadata || {}
    if (!campaign_id) return NextResponse.json({ received: true })

    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = createAdminClient()

    await supabase
      .from('campaigns')
      .update({ status: 'ready' })
      .eq('id', campaign_id)
  }

  return NextResponse.json({ received: true })
}
