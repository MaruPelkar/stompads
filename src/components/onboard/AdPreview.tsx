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
      <h3 className="font-semibold text-lg">Your Ads — Ready to Launch</h3>
      <div className="grid grid-cols-3 gap-4">
        {feedAd?.asset_url && (
          <div className="space-y-2">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Feed (1:1)</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={feedAd.asset_url}
              alt="Feed ad"
              className="w-full aspect-square object-cover rounded-lg border border-gray-800"
            />
          </div>
        )}
        {storyImageAd?.asset_url && (
          <div className="space-y-2">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Stories (9:16)</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={storyImageAd.asset_url}
              alt="Stories ad"
              className="w-full aspect-[9/16] object-cover rounded-lg border border-gray-800"
            />
          </div>
        )}
        {videoAd?.asset_url && (
          <div className="space-y-2">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Reels Video (9:16)</span>
            <video
              src={videoAd.asset_url}
              controls
              className="w-full aspect-[9/16] object-cover rounded-lg border border-gray-800"
            />
          </div>
        )}
      </div>
    </div>
  )
}
