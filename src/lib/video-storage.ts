import { createAdminClient } from '@/lib/supabase/server'

const BUCKET = 'ad-creatives'

/**
 * Downloads a video from a URL and uploads it to Supabase Storage.
 * Returns the stable public URL.
 */
export async function persistVideo(
  campaignId: string,
  adId: string,
  sourceUrl: string,
  label: 'raw' | 'final',
): Promise<string> {
  const supabase = createAdminClient()

  const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(60_000) })
  if (!res.ok) {
    throw new Error(`Failed to download ${label} video: HTTP ${res.status}`)
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  if (buffer.length < 10_000) {
    throw new Error(`Downloaded ${label} video is too small (${buffer.length} bytes), likely invalid`)
  }

  const path = `${campaignId}/${adId}/${label}.mp4`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: 'video/mp4', upsert: true })

  if (error) {
    throw new Error(`Failed to upload ${label} video to storage: ${error.message}`)
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return publicUrl
}
