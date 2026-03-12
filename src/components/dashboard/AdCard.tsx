import type { Ad, Metrics } from '@/types/database'
import { MetricsBadge } from './MetricsBadge'

interface Props {
  ad: Ad
  metrics?: Metrics
}

export function AdCard({ ad, metrics }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="aspect-square bg-gray-800">
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
          <span className="text-xs uppercase tracking-wide text-gray-500">{ad.type}</span>
          <span className={`text-xs px-2 py-1 rounded-full ${
            ad.status === 'live' ? 'bg-green-900 text-green-300' :
            ad.status === 'ready' ? 'bg-blue-900 text-blue-300' :
            'bg-gray-800 text-gray-400'
          }`}>
            {ad.status}
          </span>
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
