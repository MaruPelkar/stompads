import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdCard } from '@/components/dashboard/AdCard'
import { MetricsBadge } from '@/components/dashboard/MetricsBadge'
import type { BrandProfile, Metrics } from '@/types/database'
import GoLiveButton from './GoLiveButton'

function statusStyle(status: string) {
  if (status === 'live') return { background: 'var(--green-soft)', color: 'var(--green)' }
  if (status === 'ready') return { background: 'var(--orange-soft)', color: 'var(--orange)' }
  return { background: 'var(--input-bg)', color: 'var(--text-muted)' }
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

  return (
    <div className="space-y-8">
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', letterSpacing: '1px', color: 'var(--text)' }}>
          {brandProfile?.product_name || campaign.url}
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{campaign.url}</p>
        <span style={{
          display: 'inline-block', marginTop: '8px',
          fontSize: '10px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '1px',
          padding: '4px 10px', borderRadius: '4px',
          ...statusStyle(campaign.status),
        }}>
          {campaign.status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <MetricsBadge
          label="Daily Budget"
          value={`$${((campaign.daily_budget || 0) / 100).toFixed(0)}/day`}
        />
        <MetricsBadge label="Total Spend" value={`$${totalSpend.toFixed(2)}`} />
        <MetricsBadge label="Total Clicks" value={totalClicks.toLocaleString()} />
      </div>

      {campaign.status === 'ready' && (
        <GoLiveButton campaignId={campaign.id} />
      )}

      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '1px', color: 'var(--text)', marginBottom: '16px' }}>YOUR ADS</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {(ads || []).map(ad => (
            <AdCard
              key={ad.id}
              ad={ad}
              metrics={latestMetrics.get(ad.id) ?? undefined}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
