// Meta Ad Library API — public, no special approval needed
// Docs: https://www.facebook.com/ads/library/api/

import { langfuse } from './langfuse'

const META_API_BASE = 'https://graph.facebook.com/v19.0'

export interface CompetitorAd {
  id: string
  page_name: string
  ad_creative_body?: string
  ad_snapshot_url?: string
}

interface MetaAdResponse {
  id: string
  page_name: string
  ad_creative_bodies?: string[]
  ad_snapshot_url?: string
}

export async function findCompetitorAds(_category: string, keywords: string[], traceId?: string): Promise<CompetitorAd[]> {
  const trace = traceId
    ? langfuse.trace({ id: traceId })
    : langfuse.trace({ name: 'competitor-research' })

  const searchTerms = keywords.slice(0, 3).join(' ')

  const span = trace.span({
    name: 'meta-ad-library-search',
    input: { searchTerms, category: _category },
  })

  const params = new URLSearchParams({
    access_token: process.env.META_ACCESS_TOKEN!,
    ad_type: 'ALL',
    ad_reached_countries: '["US"]',
    search_terms: searchTerms,
    fields: 'id,page_name,ad_creative_bodies,ad_snapshot_url',
    limit: '5',
  })

  const res = await fetch(`${META_API_BASE}/ads_archive?${params}`)
  const data = await res.json()

  if (data.error) {
    console.warn('Meta Ad Library fetch failed:', data.error.message)
    span.end({ output: { error: data.error.message } })
    await langfuse.flushAsync()
    return []
  }

  const ads = (data.data || []).map((ad: MetaAdResponse) => ({
    id: ad.id,
    page_name: ad.page_name,
    ad_creative_body: ad.ad_creative_bodies?.[0],
    ad_snapshot_url: ad.ad_snapshot_url,
  }))

  span.end({ output: { count: ads.length } })
  await langfuse.flushAsync()

  return ads
}
