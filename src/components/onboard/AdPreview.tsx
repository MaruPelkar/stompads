import type { Ad } from '@/types/database'

interface Props {
  ads: Ad[]
}

export function AdPreview({ ads }: Props) {
  if (ads.length === 0) return null

  const videoAds = ads.filter(a => a.type === 'video')

  return (
    <div className="space-y-4">
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '1px', color: 'var(--text)' }}>YOUR ADS — <span style={{ color: 'var(--orange)' }}>READY TO LAUNCH</span></h3>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
        {videoAds.length} UGC video ad{videoAds.length !== 1 ? 's' : ''} for Instagram Stories & Reels
      </p>
      <div className="grid grid-cols-2 gap-6">
        {videoAds.map((ad, i) => (
          <div key={ad.id} className="space-y-2">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-muted)' }}>
              Video {i + 1} — Stories & Reels (9:16)
            </span>
            {ad.asset_url && (
              <video
                src={ad.asset_url}
                controls
                className="w-full"
                style={{ borderRadius: '6px', border: '1px solid var(--card-border)', aspectRatio: '9/16', objectFit: 'cover' }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
