import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { generateFullCampaignAds } from '@/lib/ad-generator'
import type { BrandProfile } from '@/types/database'

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

    const supabase = createAdminClient()

    const { data: campaign } = await supabase
      .from('campaigns')
      .select()
      .eq('id', campaign_id)
      .single()

    if (!campaign || !campaign.brand_profile) return NextResponse.json({ received: true })

    // Update status and trigger full generation
    await supabase
      .from('campaigns')
      .update({ status: 'generating_full' })
      .eq('id', campaign_id)

    // Generate remaining 4 image + 4 video ads (fire and forget)
    generateFullCampaignAds(campaign_id, campaign.brand_profile as unknown as BrandProfile)
      .catch(console.error)
  }

  return NextResponse.json({ received: true })
}
