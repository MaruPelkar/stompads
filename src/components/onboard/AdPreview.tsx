import type { Ad } from '@/types/database'

interface Props {
  ads: Ad[]
  generating: boolean
}

export function AdPreview({ ads, generating }: Props) {
  const imageAd = ads.find(a => a.type === 'image')
  const videoAd = ads.find(a => a.type === 'video')

  if (generating) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400">Generating your preview ads... (this takes ~30 seconds)</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Your Preview Ads</h3>
      <div className="grid grid-cols-2 gap-4">
        {imageAd?.asset_url && (
          <div className="space-y-2">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Image Ad</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageAd.asset_url}
              alt="Generated image ad"
              className="w-full rounded-lg border border-gray-800"
            />
          </div>
        )}
        {videoAd?.asset_url && (
          <div className="space-y-2">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Video Ad</span>
            <video
              src={videoAd.asset_url}
              controls
              className="w-full rounded-lg border border-gray-800"
            />
          </div>
        )}
      </div>
    </div>
  )
}
