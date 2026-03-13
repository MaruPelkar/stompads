const META_API_BASE = 'https://graph.facebook.com/v19.0'
const AD_ACCOUNT_ID = `act_${process.env.META_AD_ACCOUNT_ID!}`
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN!
const PAGE_ID = process.env.META_PAGE_ID!

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
  if (data.error) {
    const e = data.error
    const detail = [
      e.message,
      e.error_user_title,
      e.error_user_msg,
      e.error_subcode ? `subcode=${e.error_subcode}` : '',
      e.code ? `code=${e.code}` : '',
    ].filter(Boolean).join(' | ')
    console.error(`[META_API_ERROR] ${path}:`, JSON.stringify(e))
    throw new Error(`Meta API error: ${detail}`)
  }
  return data
}

export async function createCampaign(name: string): Promise<string> {
  const data = await metaFetch(`/${AD_ACCOUNT_ID}/campaigns`, 'POST', {
    name,
    objective: 'OUTCOME_TRAFFIC',
    status: 'ACTIVE',
    special_ad_categories: '[]',
    is_adset_budget_sharing_enabled: 'false',
  })
  return data.id
}

interface AdSetConfig {
  campaignId: string
  name: string
  dailyBudgetCents: number
  placements: 'feed' | 'stories_reels'
}

export async function createAdSet(config: AdSetConfig): Promise<string> {
  const targeting = buildTargeting(config.placements)

  const data = await metaFetch(`/${AD_ACCOUNT_ID}/adsets`, 'POST', {
    name: config.name,
    campaign_id: config.campaignId,
    daily_budget: config.dailyBudgetCents,
    billing_event: 'IMPRESSIONS',
    optimization_goal: 'LINK_CLICKS',
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    targeting,
    status: 'ACTIVE',
  })
  return data.id
}

function buildTargeting(placements: 'feed' | 'stories_reels'): Record<string, unknown> {
  const base = {
    geo_locations: { countries: ['US'] },
    age_min: 18,
    age_max: 65,
  }

  if (placements === 'feed') {
    return {
      ...base,
      publisher_platforms: ['facebook', 'instagram'],
      facebook_positions: ['feed'],
      instagram_positions: ['stream'],
    }
  }

  return {
    ...base,
    publisher_platforms: ['facebook', 'instagram'],
    facebook_positions: ['story'],
    instagram_positions: ['story', 'reels'],
  }
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
  primaryText: string,
  description: string,
  websiteUrl: string,
): Promise<string> {
  const data = await metaFetch(`/${AD_ACCOUNT_ID}/adcreatives`, 'POST', {
    name: `Stompads Image ${Date.now()}`,
    object_story_spec: {
      page_id: PAGE_ID,
      link_data: {
        image_hash: imageHash,
        link: websiteUrl,
        message: primaryText,
        name: headline,
        description: description,
        call_to_action: { type: 'LEARN_MORE', value: { link: websiteUrl } },
      },
    },
  })
  return data.id
}

export async function createVideoAdCreative(
  videoUrl: string,
  headline: string,
  primaryText: string,
  description: string,
  websiteUrl: string,
): Promise<string> {
  // Step 1: Upload video to Meta
  const uploadData = await metaFetch(`/${AD_ACCOUNT_ID}/advideos`, 'POST', {
    file_url: videoUrl,
    name: `Stompads Video ${Date.now()}`,
  })
  const videoId = uploadData.id

  // Step 2: Upload a placeholder thumbnail image
  // Create a minimal 1080x1920 orange PNG as thumbnail
  // Meta will auto-replace with actual video frame, but needs something valid at creation time
  const placeholderImageHash = await uploadPlaceholderThumbnail()

  // Step 3: Create the creative
  const data = await metaFetch(`/${AD_ACCOUNT_ID}/adcreatives`, 'POST', {
    name: `Stompads Video ${Date.now()}`,
    object_story_spec: {
      page_id: PAGE_ID,
      video_data: {
        video_id: videoId,
        image_hash: placeholderImageHash,
        title: headline,
        message: primaryText,
        call_to_action: { type: 'LEARN_MORE', value: { link: websiteUrl } },
      },
    },
  })
  return data.id
}

// Generate and upload a minimal valid PNG as a video thumbnail placeholder
async function uploadPlaceholderThumbnail(): Promise<string> {
  // Minimal 1x1 orange PNG (valid image that Meta will accept)
  // This gets replaced by the actual video frame once Meta processes the video
  const PNG_HEADER = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, // 8-bit RGB
    0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
    0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00, 0x00, // compressed data
    0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33, // CRC
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, // IEND chunk
    0xAE, 0x42, 0x60, 0x82,
  ])

  const base64 = PNG_HEADER.toString('base64')
  const imgData = await metaFetch(`/${AD_ACCOUNT_ID}/adimages`, 'POST', {
    bytes: base64,
  })
  const hashKey = Object.keys(imgData.images)[0]
  return imgData.images[hashKey].hash
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
