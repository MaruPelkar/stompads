import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdCard } from '@/components/dashboard/AdCard'
import { MetricsBadge } from '@/components/dashboard/MetricsBadge'
import type { BrandProfile, Metrics } from '@/types/database'
import GoLiveButton from './GoLiveButton'
import PauseResumeButton from './PauseResumeButton'
import ResumeCheckout from './ResumeCheckout'
import Link from 'next/link'

function badgeClass(status: string) {
  if (status === 'live') return 'badge badge-live'
  if (status === 'ready') return 'badge badge-ready'
  if (status === 'paused') return 'badge badge-default'
  return 'badge badge-default'
}

export default async function CampaignPage({ params }: { params: { campaignId: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: campaign } = await supabase
    .from('campaigns')
    .select()
    .eq('id', params.campaignId)
    .eq('user_id', user.id)
    .single()

  if (!campaign) redirect('/dashboard')

  const { data: ads } = await supabase
    .from('ads')
    .select()
    .eq('campaign_id', params.campaignId)
    .order('created_at')

  const adIds = (ads || []).map(a => a.id)
  const { data: allMetrics } = adIds.length > 0
    ? await supabase
        .from('metrics')
        .select()
        .in('ad_id', adIds)
        .order('recorded_at', { ascending: false })
    : { data: [] as Metrics[] }

  const latestMetrics = new Map<string, Metrics>()
  for (const m of allMetrics || []) {
    if (!latestMetrics.has(m.ad_id)) latestMetrics.set(m.ad_id, m)
  }

  const brandProfile = campaign.brand_profile as unknown as BrandProfile
  const totalSpend = Array.from(latestMetrics.values()).reduce((s, m) => s + Number(m?.spend || 0), 0)
  const totalClicks = Array.from(latestMetrics.values()).reduce((s, m) => s + (m?.clicks || 0), 0)
  const hasAds = ads && ads.length > 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="heading-lg">{brandProfile?.product_name || campaign.url}</h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>{campaign.url}</p>
        <span className={badgeClass(campaign.status)} style={{ marginTop: '10px' }}>{campaign.status}</span>
      </div>

      {/* Stuck in generating — offer to retry */}
      {campaign.status === 'generating' && (
        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          <div className="spinner mb-4" style={{ margin: '0 auto 16px' }} />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text)' }}>Still processing.</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>If stuck, try again.</p>
          <Link href={`/onboard?url=${encodeURIComponent(campaign.url)}`} className="btn-secondary" style={{ marginTop: '16px' }}>
            Retry
          </Link>
        </div>
      )}

      {/* Draft (failed) — offer to retry */}
      {campaign.status === 'draft' && (
        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text)' }}>This campaign failed to generate.</p>
          <Link href={`/onboard?url=${encodeURIComponent(campaign.url)}`} className="btn-primary" style={{ marginTop: '16px' }}>
            Try Again
          </Link>
        </div>
      )}

      {/* Payment pending — resume checkout */}
      {campaign.status === 'payment_pending' && hasAds && (
        <ResumeCheckout campaignId={campaign.id} />
      )}

      {/* Metrics (only show if budget is set) */}
      {campaign.daily_budget && (
        <div className="grid grid-cols-3 gap-4">
          <MetricsBadge label="Daily Budget" value={`$${(campaign.daily_budget / 100).toFixed(0)}/day`} />
          <MetricsBadge label="Total Spend" value={`$${totalSpend.toFixed(2)}`} />
          <MetricsBadge label="Total Clicks" value={totalClicks.toLocaleString()} />
        </div>
      )}

      {/* Ready — go live */}
      {campaign.status === 'ready' && (
        <GoLiveButton campaignId={campaign.id} />
      )}

      {/* Live/Paused — toggle */}
      <PauseResumeButton campaignId={campaign.id} currentStatus={campaign.status} />

      {/* Ads */}
      {hasAds && (
        <div>
          <h2 className="heading-md" style={{ marginBottom: '16px' }}>YOUR ADS</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {ads.map(ad => (
              <AdCard key={ad.id} ad={ad} metrics={latestMetrics.get(ad.id) ?? undefined} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
