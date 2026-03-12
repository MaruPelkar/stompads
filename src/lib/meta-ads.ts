const META_API_BASE = 'https://graph.facebook.com/v19.0'
const AD_ACCOUNT_ID = `act_${process.env.META_AD_ACCOUNT_ID!}`
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN!

async function metaFetch(path: string, method: 'GET' | 'POST' = 'POST', body?: Record<string, unknown>) {
  const url = `${META_API_BASE}${path}`
  const params = new URLSearchParams({ access_token: ACCESS_TOKEN })

  const res = await fetch(method === 'GET' ? `${url}?${params}` : url, {
    method,
    headers: method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
    body: method === 'POST' ? new URLSearchParams({
      access_token: ACCESS_TOKEN,
      ...Object.fromEntries(
        Object.entries(body || {}).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])
      ),
    }) : undefined,
  })

  const data = await res.json()
  if (data.error) throw new Error(`Meta API error: ${data.error.message}`)
  return data
}

export async function createCampaign(name: string): Promise<string> {
  const data = await metaFetch(`/${AD_ACCOUNT_ID}/campaigns`, 'POST', {
    name,
    objective: 'OUTCOME_TRAFFIC',
    status: 'ACTIVE',
    special_ad_categories: '[]',
  })
  return data.id
}

export async function createAdSet(
  campaignId: string,
  name: string,
  dailyBudgetCents: number,
  targeting: Record<string, unknown>
): Promise<string> {
  const data = await metaFetch(`/${AD_ACCOUNT_ID}/adsets`, 'POST', {
    name,
    campaign_id: campaignId,
    daily_budget: dailyBudgetCents,
    billing_event: 'IMPRESSIONS',
    optimization_goal: 'LINK_CLICKS',
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    targeting,
    status: 'ACTIVE',
  })
  return data.id
}

export async function uploadAdImage(imageUrl: string): Promise<string> {
  const imageRes = await fetch(imageUrl)
  const imageBuffer = await imageRes.arrayBuffer()
  const base64 = Buffer.from(imageBuffer).toString('base64')

  const data = await metaFetch(`/${AD_ACCOUNT_ID}/adimages`, 'POST', {
    bytes: base64,
  })

  const hashKey = Object.keys(data.images)[0]
  return data.images[hashKey].hash
}

export async function createImageAdCreative(
  imageHash: string,
  headline: string,
  body: string,
  websiteUrl: string,
  pageId: string
): Promise<string> {
  const data = await metaFetch(`/${AD_ACCOUNT_ID}/adcreatives`, 'POST', {
    name: `Stompads Image Creative ${Date.now()}`,
    object_story_spec: {
      page_id: pageId,
      link_data: {
        image_hash: imageHash,
        link: websiteUrl,
        message: body,
        name: headline,
        call_to_action: { type: 'LEARN_MORE', value: { link: websiteUrl } },
      },
    },
  })
  return data.id
}

export async function createVideoAdCreative(
  videoUrl: string,
  headline: string,
  body: string,
  websiteUrl: string,
  pageId: string
): Promise<string> {
  const uploadData = await metaFetch(`/${AD_ACCOUNT_ID}/advideos`, 'POST', {
    file_url: videoUrl,
    name: `Stompads Video ${Date.now()}`,
  })

  const videoId = uploadData.id

  const data = await metaFetch(`/${AD_ACCOUNT_ID}/adcreatives`, 'POST', {
    name: `Stompads Video Creative ${Date.now()}`,
    object_story_spec: {
      page_id: pageId,
      video_data: {
        video_id: videoId,
        title: headline,
        message: body,
        call_to_action: { type: 'LEARN_MORE', value: { link: websiteUrl } },
      },
    },
  })
  return data.id
}

export async function createAd(adSetId: string, creativeId: string, name: string): Promise<string> {
  const data = await metaFetch(`/${AD_ACCOUNT_ID}/ads`, 'POST', {
    name,
    adset_id: adSetId,
    creative: { creative_id: creativeId },
    status: 'ACTIVE',
  })
  return data.id
}

export function buildTargeting(): Record<string, unknown> {
  return {
    geo_locations: { countries: ['US'] },
    age_min: 18,
    age_max: 65,
    publisher_platforms: ['facebook', 'instagram'],
    facebook_positions: ['feed', 'story'],
    instagram_positions: ['stream', 'story'],
  }
}
