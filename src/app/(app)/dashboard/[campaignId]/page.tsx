import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { BrandProfile, Metrics, Ad } from '@/types/database'
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

function LiveAdCard({ ad, metrics }: { ad: Ad; metrics?: Metrics }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Video — compact */}
      <div style={{ height: '280px', background: 'var(--input-bg)' }}>
        {ad.asset_url && (
          <video src={ad.asset_url} className="w-full h-full object-cover" muted loop autoPlay playsInline />
        )}
      </div>

      {/* Per-ad KPIs */}
      <div style={{ padding: '16px' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: '12px' }}>
          <span className="label">{ad.type} {ad.aspect_ratio}</span>
          <span className={badgeClass(ad.status)}>{ad.status}</span>
        </div>

        {metrics ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <span className="label">Impressions</span>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text)', marginTop: '2px' }}>{metrics.impressions.toLocaleString()}</p>
            </div>
            <div>
              <span className="label">Clicks</span>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text)', marginTop: '2px' }}>{metrics.clicks.toLocaleString()}</p>
            </div>
            <div>
              <span className="label">CTR</span>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--orange)', marginTop: '2px' }}>{(metrics.ctr * 100).toFixed(2)}%</p>
            </div>
            <div>
              <span className="label">CPC</span>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text)', marginTop: '2px' }}>${Number(metrics.cpc).toFixed(2)}</p>
            </div>
            <div className="col-span-2">
              <span className="label">Spend</span>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text)', marginTop: '2px' }}>${Number(metrics.spend).toFixed(2)}</p>
            </div>
          </div>
        ) : (
          <p className="label" style={{ fontSize: '11px' }}>Metrics sync hourly. Check back soon.</p>
        )}
      </div>
    </div>
  )
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
  const totalImpressions = Array.from(latestMetrics.values()).reduce((s, m) => s + (m?.impressions || 0), 0)
  const hasAds = ads && ads.length > 0
  const isRunning = campaign.status === 'live' || campaign.status === 'paused'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className={isRunning ? 'heading-md' : 'heading-lg'}>{brandProfile?.product_name || campaign.url}</h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{campaign.url}</p>
        </div>
        <span className={badgeClass(campaign.status)}>{campaign.status}</span>
      </div>

      {/* Running campaign — compact summary bar */}
      {isRunning && campaign.daily_budget && (
        <div className="flex gap-6" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-light)' }}>
          <span><strong style={{ color: 'var(--text)' }}>${(campaign.daily_budget / 100).toFixed(0)}</strong>/day</span>
          <span><strong style={{ color: 'var(--text)' }}>${totalSpend.toFixed(2)}</strong> spent</span>
          <span><strong style={{ color: 'var(--text)' }}>{totalClicks.toLocaleString()}</strong> clicks</span>
          <span><strong style={{ color: 'var(--text)' }}>{totalImpressions.toLocaleString()}</strong> impressions</span>
        </div>
      )}

      {/* Non-running — bigger metric cards */}
      {!isRunning && campaign.daily_budget && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card" style={{ padding: '16px' }}>
            <p className="label">Daily Budget</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '26px', color: 'var(--text)', marginTop: '4px' }}>${(campaign.daily_budget / 100).toFixed(0)}/day</p>
          </div>
          <div className="card" style={{ padding: '16px' }}>
            <p className="label">Total Spend</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '26px', color: 'var(--text)', marginTop: '4px' }}>${totalSpend.toFixed(2)}</p>
          </div>
          <div className="card" style={{ padding: '16px' }}>
            <p className="label">Total Clicks</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '26px', color: 'var(--text)', marginTop: '4px' }}>{totalClicks.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Stuck in generating */}
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

      {/* Draft (failed) */}
      {campaign.status === 'draft' && (
        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text)' }}>Campaign failed.</p>
          <Link href={`/onboard?url=${encodeURIComponent(campaign.url)}`} className="btn-primary" style={{ marginTop: '16px' }}>
            Try Again
          </Link>
        </div>
      )}

      {/* Payment pending */}
      {campaign.status === 'payment_pending' && hasAds && (
        <ResumeCheckout campaignId={campaign.id} />
      )}

      {/* Ready — go live */}
      {campaign.status === 'ready' && (
        <GoLiveButton campaignId={campaign.id} />
      )}

      {/* Live/Paused — toggle */}
      <PauseResumeButton campaignId={campaign.id} currentStatus={campaign.status} />

      {/* Ads with per-ad KPIs */}
      {hasAds && (
        <div>
          <h2 className="heading-md" style={{ marginBottom: '12px' }}>YOUR ADS</h2>
          <div className="grid grid-cols-2 gap-4">
            {ads.map(ad => (
              <LiveAdCard key={ad.id} ad={ad} metrics={latestMetrics.get(ad.id) ?? undefined} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
