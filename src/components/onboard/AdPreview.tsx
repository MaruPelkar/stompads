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
      <div style={{ padding: '16px 20px 0' }}>
        <div className="flex justify-between items-center">
          <h3 className="heading-md">YOUR AD</h3>
          <span className="badge badge-ready">Ready</span>
        </div>
        <p className="label" style={{ marginTop: '4px' }}>
          UGC video — Instagram Stories & Reels
        </p>
      </div>

      {/* Video preview — 9:16 aspect ratio in phone frame */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 20px 24px' }}>
        <div style={{
          position: 'relative',
          width: 'min(200px, 50vw)',
          maxWidth: '200px',
        }}>
          {/* Phone frame */}
          <div style={{
            borderRadius: '16px',
            overflow: 'hidden',
            border: '2px solid var(--text)',
            boxShadow: 'var(--shadow-lg)',
            background: '#000',
          }}>
            <video
              src={videoAd.asset_url}
              controls
              playsInline
              style={{
                width: '100%',
                aspectRatio: '9 / 16',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>

          {/* Platform badge */}
          <div style={{
            textAlign: 'center', marginTop: '10px',
            fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase',
            letterSpacing: '1.5px', color: 'var(--text-muted)',
          }}>
            Stories & Reels
          </div>
        </div>
      </div>
    </div>
  )
}
