import type { Ad } from '@/types/database'

interface Props {
  ads: Ad[]
}

export function AdPreview({ ads }: Props) {
  if (ads.length === 0) return null

  const feedAd = ads.find(a => a.placement === 'feed')
  const storyImageAd = ads.find(a => a.type === 'image' && a.placement === 'stories_reels')
  const videoAd = ads.find(a => a.type === 'video')

  return (
    <div className="space-y-4">
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '1px', color: 'var(--text)' }}>YOUR ADS — <span style={{ color: 'var(--orange)' }}>READY TO LAUNCH</span></h3>
      <div className="grid grid-cols-3 gap-4">
        {feedAd?.asset_url && (
          <div className="space-y-2">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-muted)' }}>Feed (1:1)</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={feedAd.asset_url}
              alt="Feed ad"
              className="w-full aspect-square object-cover"
              style={{ borderRadius: '6px', border: '1px solid var(--card-border)' }}
            />
          </div>
        )}
        {storyImageAd?.asset_url && (
          <div className="space-y-2">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-muted)' }}>Stories (9:16)</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={storyImageAd.asset_url}
              alt="Stories ad"
              className="w-full aspect-[9/16] object-cover"
              style={{ borderRadius: '6px', border: '1px solid var(--card-border)' }}
            />
          </div>
        )}
        {videoAd?.asset_url && (
          <div className="space-y-2">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-muted)' }}>Reels Video (9:16)</span>
            <video
              src={videoAd.asset_url}
              controls
              className="w-full aspect-[9/16] object-cover"
              style={{ borderRadius: '6px', border: '1px solid var(--card-border)' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
