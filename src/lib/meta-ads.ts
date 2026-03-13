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

// ─── CAMPAIGN (with campaign-level daily budget) ───

export async function createCampaignWithBudget(name: string, dailyBudgetCents: number): Promise<string> {
  const data = await metaFetch(`/${AD_ACCOUNT_ID}/campaigns`, 'POST', {
    name,
    objective: 'OUTCOME_TRAFFIC',
    status: 'ACTIVE',
    special_ad_categories: '[]',
    daily_budget: dailyBudgetCents,
  })
  return data.id
}

// ─── AD SET (no budget — campaign controls it) ───

export async function createAdSet(
  campaignId: string,
  name: string,
): Promise<string> {
  const data = await metaFetch(`/${AD_ACCOUNT_ID}/adsets`, 'POST', {
    name,
    campaign_id: campaignId,
    billing_event: 'IMPRESSIONS',
    optimization_goal: 'LINK_CLICKS',
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    // Advantage+ targeting — let Meta optimize everything
    targeting: {
      geo_locations: { countries: ['US'] },
    },
    status: 'ACTIVE',
  })
  return data.id
}

// ─── CREATIVES ───

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

async function uploadThumbnailFromUrl(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl)
  const buffer = Buffer.from(await res.arrayBuffer())
  const base64 = buffer.toString('base64')

  const imgData = await metaFetch(`/${AD_ACCOUNT_ID}/adimages`, 'POST', {
    bytes: base64,
  })
  const hashKey = Object.keys(imgData.images)[0]
  return imgData.images[hashKey].hash
}

export async function createVideoAdCreative(
  videoUrl: string,
  headline: string,
  primaryText: string,
  description: string,
  websiteUrl: string,
  brandFallbackImageUrl?: string,
): Promise<string> {
  // Step 1: Upload video
  const uploadData = await metaFetch(`/${AD_ACCOUNT_ID}/advideos`, 'POST', {
    file_url: videoUrl,
    name: `Stompads Video ${Date.now()}`,
  })
  const videoId = uploadData.id

  // Step 2: Wait for Meta to process video, then get auto-generated thumbnail (first frame)
  let imageHash: string | null = null
  for (let attempt = 0; attempt < 8; attempt++) {
    await new Promise(r => setTimeout(r, 3000))
    try {
      const videoInfo = await metaFetch(`/${videoId}?fields=thumbnails,picture`, 'GET')
      const thumbUri = videoInfo?.thumbnails?.data?.[0]?.uri || videoInfo?.picture
      if (thumbUri) {
        imageHash = await uploadThumbnailFromUrl(thumbUri)
        break
      }
    } catch {
      // Not ready yet
    }
  }

  // Fallback: use brand's OG image or logo
  if (!imageHash && brandFallbackImageUrl) {
    console.warn('[META] Could not extract video thumbnail, using brand image fallback')
    try {
      imageHash = await uploadThumbnailFromUrl(brandFallbackImageUrl)
    } catch {
      console.warn('[META] Brand image fallback also failed')
    }
  }

  // Step 3: Create creative
  const data = await metaFetch(`/${AD_ACCOUNT_ID}/adcreatives`, 'POST', {
    name: `Stompads Video ${Date.now()}`,
    object_story_spec: {
      page_id: PAGE_ID,
      video_data: {
        video_id: videoId,
        image_hash: imageHash,
        title: headline,
        message: primaryText,
        call_to_action: { type: 'LEARN_MORE', value: { link: websiteUrl } },
      },
    },
  })
  return data.id
}

// ─── ADS ───

export async function createAd(adSetId: string, creativeId: string, name: string): Promise<string> {
  const data = await metaFetch(`/${AD_ACCOUNT_ID}/ads`, 'POST', {
    name,
    adset_id: adSetId,
    creative: { creative_id: creativeId },
    status: 'ACTIVE',
  })
  return data.id
}

// ─── PAUSE / RESUME ───

export async function pauseCampaign(metaCampaignId: string): Promise<void> {
  await metaFetch(`/${metaCampaignId}`, 'POST', {
    status: 'PAUSED',
  })
}

export async function resumeCampaign(metaCampaignId: string): Promise<void> {
  await metaFetch(`/${metaCampaignId}`, 'POST', {
    status: 'ACTIVE',
  })
}
