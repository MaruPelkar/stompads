import type { Ad } from '@/types/database'

interface Props {
  ads: Ad[]
}

export function AdPreview({ ads }: Props) {
  if (ads.length === 0) return null

  const videoAds = ads.filter(a => a.type === 'video')

  return (
    <div className="space-y-3">
      <h3 className="heading-md">ADS <span style={{ color: 'var(--orange)' }}>READY</span></h3>
      <p className="label" style={{ fontSize: '11px' }}>
        {videoAds.length} video ad{videoAds.length !== 1 ? 's' : ''} — Instagram Stories & Reels
      </p>
      <div className="flex gap-4">
        {videoAds.map((ad, i) => (
          <div key={ad.id} style={{ flex: '0 0 auto', width: '140px' }}>
            <span className="label" style={{ fontSize: '9px', display: 'block', marginBottom: '6px' }}>Video {i + 1}</span>
            {ad.asset_url && (
              <video
                src={ad.asset_url}
                controls
                style={{
                  width: '140px', height: '248px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--card-border)',
                  objectFit: 'cover',
                  background: 'var(--input-bg)',
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
