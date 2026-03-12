import type { Ad, Metrics } from '@/types/database'
import { MetricsBadge } from './MetricsBadge'

interface Props {
  ad: Ad
  metrics?: Metrics
}

function badgeClass(status: string) {
  if (status === 'live') return 'badge badge-live'
  if (status === 'ready') return 'badge badge-ready'
  return 'badge badge-default'
}

export function AdCard({ ad, metrics }: Props) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="aspect-square" style={{ background: 'var(--input-bg)' }}>
        {ad.type === 'image' && ad.asset_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ad.asset_url} alt="Ad creative" className="w-full h-full object-cover" />
        )}
        {ad.type === 'video' && ad.asset_url && (
          <video src={ad.asset_url} className="w-full h-full object-cover" muted loop autoPlay />
        )}
      </div>
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="label">{ad.type} {ad.aspect_ratio}</span>
          <span className={badgeClass(ad.status)}>{ad.status}</span>
        </div>
        {metrics && (
          <div className="grid grid-cols-2 gap-2">
            <MetricsBadge label="CTR" value={`${(metrics.ctr * 100).toFixed(2)}%`} />
            <MetricsBadge label="CPC" value={`$${Number(metrics.cpc).toFixed(2)}`} />
            <MetricsBadge label="Clicks" value={metrics.clicks.toLocaleString()} />
            <MetricsBadge label="Spend" value={`$${Number(metrics.spend).toFixed(2)}`} />
          </div>
        )}
      </div>
    </div>
  )
}
