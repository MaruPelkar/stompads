import { createAdminClient } from '@/lib/supabase/server'
import type { BrandAssets } from '@/types/database'

const BUCKET = 'ad-creatives'

/**
 * Downloads images from external URLs and re-uploads them to Supabase Storage.
 * Returns a new BrandAssets with our own public URLs.
 * This ensures Fal.ai can always access the images reliably.
 */
export async function storeBrandAssets(
  campaignId: string,
  assets: BrandAssets
): Promise<BrandAssets> {
  const supabase = createAdminClient()

  async function uploadFromUrl(externalUrl: string, name: string): Promise<string | null> {
    try {
      if (!externalUrl || !externalUrl.startsWith('http')) return null

      const res = await fetch(externalUrl, { signal: AbortSignal.timeout(10000) })
      if (!res.ok) return null

      const contentType = res.headers.get('content-type') || 'image/png'
      const buffer = Buffer.from(await res.arrayBuffer())

      // Skip tiny files (likely tracking pixels) and huge files
      if (buffer.length < 1000 || buffer.length > 10_000_000) return null

      const ext = contentType.includes('png') ? 'png'
        : contentType.includes('webp') ? 'webp'
        : contentType.includes('svg') ? 'svg'
        : 'jpg'
      const path = `${campaignId}/${name}.${ext}`

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, buffer, { contentType, upsert: true })

      if (error) {
        console.warn(`[ASSET_UPLOAD_FAILED] ${name}: ${error.message}`)
        return null
      }

      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
      return publicUrl
    } catch (err) {
      console.warn(`[ASSET_DOWNLOAD_FAILED] ${name}: ${err instanceof Error ? err.message : err}`)
      return null
    }
  }

  // Upload all assets in parallel
  const [logoUrl, faviconUrl, ogImage, ...productImageResults] = await Promise.all([
    assets.logoUrl ? uploadFromUrl(assets.logoUrl, 'logo') : Promise.resolve(null),
    assets.faviconUrl ? uploadFromUrl(assets.faviconUrl, 'favicon') : Promise.resolve(null),
    assets.ogImage ? uploadFromUrl(assets.ogImage, 'og-image') : Promise.resolve(null),
    ...assets.productImages.map((url, i) => uploadFromUrl(url, `product-${i}`)),
  ])

  return {
    logoUrl,
    faviconUrl,
    ogImage,
    productImages: productImageResults.filter((url): url is string => url !== null),
    brandColors: assets.brandColors, // colors are just hex strings, no storage needed
  }
}
