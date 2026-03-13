import type { Ad } from '@/types/database'

interface Props {
  ads: Ad[]
}

export function AdPreview({ ads }: Props) {
  if (ads.length === 0) return null

  const videoAd = ads.find(a => a.type === 'video')
  if (!videoAd?.asset_url) return null

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 0' }}>
        <div className="flex justify-between items-center">
          <h3 className="heading-md">YOUR AD</h3>
          <span className="badge badge-ready">Ready</span>
        </div>
        <p className="label" style={{ fontSize: '11px', marginTop: '4px' }}>
          UGC video — Instagram Stories & Reels
        </p>
      </div>

      {/* Video preview — centered, phone-sized */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 24px' }}>
        <div style={{ position: 'relative', width: '220px' }}>
          {/* Phone frame */}
          <div style={{
            borderRadius: '20px',
            overflow: 'hidden',
            border: '3px solid var(--text)',
            boxShadow: 'var(--shadow-lg)',
            background: '#000',
          }}>
            {/* Notch */}
            <div style={{
              position: 'absolute', top: '3px', left: '50%', transform: 'translateX(-50%)',
              width: '80px', height: '20px', background: '#000', borderRadius: '0 0 12px 12px',
              zIndex: 2,
            }} />
            <video
              src={videoAd.asset_url}
              controls
              playsInline
              style={{
                width: '100%',
                aspectRatio: '9/16',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>

          {/* Platform badge */}
          <div style={{
            position: 'absolute', bottom: '-10px', left: '50%', transform: 'translateX(-50%)',
            fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase',
            letterSpacing: '1.5px', background: 'var(--card-bg)', color: 'var(--text-muted)',
            padding: '4px 12px', borderRadius: 'var(--radius-full)',
            border: '1px solid var(--card-border)', whiteSpace: 'nowrap',
          }}>
            Stories & Reels
          </div>
        </div>
      </div>

      {/* Bottom padding for the badge */}
      <div style={{ height: '16px' }} />
    </div>
  )
}
