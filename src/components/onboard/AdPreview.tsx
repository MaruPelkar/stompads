import type { Ad } from '@/types/database'

interface Props {
  ads: Ad[]
}

export function AdPreview({ ads }: Props) {
  if (ads.length === 0) return null

  const videoAds = ads.filter(a => a.type === 'video')

  return (
    <div className="space-y-4">
      <h3 className="heading-md">YOUR ADS — <span style={{ color: 'var(--orange)' }}>READY TO LAUNCH</span></h3>
      <p className="label" style={{ fontSize: '11px' }}>
        {videoAds.length} UGC video ad{videoAds.length !== 1 ? 's' : ''} for Instagram Stories & Reels
      </p>
      <div className="grid grid-cols-2 gap-6">
        {videoAds.map((ad, i) => (
          <div key={ad.id} className="space-y-2">
            <span className="label">Video {i + 1} — Stories & Reels</span>
            {ad.asset_url && (
              <video
                src={ad.asset_url}
                controls
                className="w-full"
                style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', aspectRatio: '9/16', objectFit: 'cover' }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
