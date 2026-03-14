# Robust Ad Pipeline Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the video generation → subtitle burning → Meta publishing pipeline reliable by persisting assets to Supabase Storage, tracking pipeline steps, making subtitle failure a hard error with retry, and making Go Live resumable.

**Architecture:** Each Fal output is immediately downloaded and uploaded to Supabase Storage so `asset_url` is always a stable URL. A `pipeline_step` column on `ads` tracks exact progress. Subtitle failure blocks the pipeline (user must retry). Go Live checks for existing Meta IDs before creating new resources, saving each ID immediately so retries resume from the last successful step.

**Tech Stack:** Next.js 14, Supabase (DB + Storage), Fal AI, Meta Ads API, TypeScript

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `supabase/migrations/007_pipeline_step.sql` | Add `pipeline_step` and `raw_asset_url` columns to `ads` |
| Modify | `src/types/database.ts` | Add `pipeline_step` and `raw_asset_url` to Ad type |
| Create | `src/lib/video-storage.ts` | Download video from URL → upload to Supabase Storage → return public URL |
| Modify | `src/lib/fal-client.ts` | Subtitle failure throws instead of silent fallback; add retry-once logic |
| Modify | `src/lib/ad-generator.ts` | Persist assets after each Fal step, update `pipeline_step`, support retry from `video_ready` |
| Modify | `src/app/api/campaigns/[campaignId]/go-live/route.ts` | Resumable: check existing Meta IDs, save each ID immediately |
| Create | `src/app/api/campaigns/[campaignId]/retry-subtitles/route.ts` | API endpoint to retry subtitle burning for a failed ad |
| Modify | `src/app/(app)/dashboard/[campaignId]/page.tsx` | Show subtitle failure state + retry button |
| Modify | `src/app/(app)/onboard/page.tsx` | Recognize `subtitle_failed` pipeline step in polling |

---

## Task 1: Database Migration + Types

**Files:**
- Create: `supabase/migrations/007_pipeline_step.sql`
- Modify: `src/types/database.ts`

- [ ] **Step 1: Create migration**

```sql
-- 007_pipeline_step.sql
-- Add pipeline_step to ads for granular progress tracking
-- Add raw_asset_url to preserve the pre-subtitle video

ALTER TABLE ads ADD COLUMN pipeline_step text NOT NULL DEFAULT 'video_generating';
ALTER TABLE ads ADD COLUMN raw_asset_url text;
```

- [ ] **Step 2: Update TypeScript types**

In `src/types/database.ts`, add `pipeline_step` and `raw_asset_url` to the `ads` Row type:

```typescript
// Add to ads.Row:
pipeline_step: 'video_generating' | 'video_ready' | 'subtitling' | 'subtitle_failed' | 'subtitled' | 'ready'
raw_asset_url: string | null
```

Add to `ads.Insert` — `pipeline_step` will use the DB default, `raw_asset_url` is nullable.

Update the `Ad` export type alias (it derives from Row, so it auto-updates).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/007_pipeline_step.sql src/types/database.ts
git commit -m "feat: add pipeline_step and raw_asset_url columns to ads table"
```

---

## Task 2: Video Storage Utility

**Files:**
- Create: `src/lib/video-storage.ts`

- [ ] **Step 1: Create video-storage.ts**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/video-storage.ts
git commit -m "feat: add video-storage utility for persisting Fal videos to Supabase"
```

---

## Task 3: Make Subtitle Failure a Hard Error

**Files:**
- Modify: `src/lib/fal-client.ts`

- [ ] **Step 1: Update `addSubtitles` to throw on failure instead of silently returning raw URL**

Change the catch block in `addSubtitles` (around line 249-255) from:

```typescript
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    span.end({ output: { error: msg } })
    await langfuse.flushAsync()
    console.warn(`[SUBTITLE_FAILED] Returning raw video. Error: ${msg}`)
    return videoUrl
  }
```

To:

```typescript
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    span.end({ output: { error: msg } })
    await langfuse.flushAsync()
    throw new Error(`Subtitle burning failed: ${msg}`)
  }
```

- [ ] **Step 2: Update `generateVideoAd` to NOT catch subtitle errors**

The current `generateVideoAd` function calls `addSubtitles` and the error will now propagate. This is correct — the caller (`ad-generator.ts`) will handle the error and set the pipeline step to `subtitle_failed`.

No code change needed in `generateVideoAd` itself — just verify the error propagates.

- [ ] **Step 3: Export `addSubtitles` so it can be called independently for retry**

Add `export` to the `addSubtitles` function declaration:

```typescript
export async function addSubtitles(
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/fal-client.ts
git commit -m "feat: make subtitle failure a hard error, export addSubtitles for retry"
```

---

## Task 4: Pipeline-Aware Ad Generator with Asset Persistence

**Files:**
- Modify: `src/lib/ad-generator.ts`

- [ ] **Step 1: Rewrite `generateCampaignAds` to persist assets and track pipeline steps**

The new flow:
1. Create ad row with `pipeline_step: 'video_generating'`
2. Generate video via Fal
3. Persist raw video to Supabase Storage → update `raw_asset_url` + `pipeline_step: 'video_ready'`
4. If subtitles enabled: update `pipeline_step: 'subtitling'` → burn subtitles → persist final → update `asset_url` + `pipeline_step: 'subtitled'`
5. If subtitles fail: update `pipeline_step: 'subtitle_failed'`, set `status: 'failed'`
6. If subtitles disabled: copy raw URL to asset_url
7. Update `pipeline_step: 'ready'`, `status: 'ready'`

```typescript
import { createAdminClient } from '@/lib/supabase/server'
import { generateVideoAd, addSubtitles } from './fal-client'
import { generateVideoScripts } from './brand-profiler'
import { persistVideo } from './video-storage'
import { getAdConfig } from './ad-config'
import type { BrandProfile } from '@/types/database'
import { langfuse } from './langfuse'

function buildVideoPrompt(script: string, setting: string, brandProfile: BrandProfile): string {
  return `Create a 12-second UGC-style vertical video ad (9:16 aspect ratio).

Show an attractive, well-groomed, relatable person (20s-30s) ${setting}.
They are speaking this script directly into the camera, naturally and enthusiastically:

"${script}"

REQUIREMENTS:
- Film style: shot on iPhone, natural lighting, slightly shaky handheld feel
- The person uses natural hand gestures and animated facial expressions
- They look genuine and excited, like sharing a real discovery with a friend
- Product: ${brandProfile.product_name}
- Tone: ${brandProfile.tone}, authentic, trustworthy
- No text overlays, no captions, no logos, no watermarks, no end cards
- This should look indistinguishable from a real person's organic social media video`
}

/**
 * Generate 1 UGC video ad with full pipeline tracking.
 * Creates the ad row, generates video, persists to storage, burns subtitles.
 */
export async function generateCampaignAds(
  campaignId: string,
  brandProfile: BrandProfile,
): Promise<void> {
  const supabase = createAdminClient()
  const config = await getAdConfig()

  const trace = langfuse.trace({
    name: 'generate-campaign-ads',
    metadata: { campaignId, product: brandProfile.product_name },
  })

  // Generate script
  const videoScripts = await generateVideoScripts(brandProfile)
  const { script, setting } = videoScripts[0]
  const videoPrompt = buildVideoPrompt(script, setting, brandProfile)

  // Create ad row in DB first — so we have an ID for storage paths
  const { data: adRow, error: insertError } = await supabase.from('ads').insert({
    campaign_id: campaignId,
    type: 'video' as const,
    is_preview: true,
    asset_url: null,
    raw_asset_url: null,
    fal_request_id: null,
    status: 'generating' as const,
    prompt_used: videoPrompt,
    aspect_ratio: '9:16',
    placement: 'stories_reels',
    pipeline_step: 'video_generating',
    meta_ad_id: null,
    meta_creative_id: null,
  }).select().single()

  if (insertError || !adRow) {
    throw new Error(`Failed to create ad row: ${insertError?.message}`)
  }

  const adId = adRow.id

  try {
    // Step 1: Generate raw video via Fal (without subtitles)
    const rawResult = await generateRawVideoOnly(videoPrompt, trace.id)

    // Step 2: Persist raw video to Supabase Storage
    const rawUrl = await persistVideo(campaignId, adId, rawResult.url, 'raw')
    await supabase.from('ads').update({
      raw_asset_url: rawUrl,
      fal_request_id: rawResult.requestId,
      pipeline_step: 'video_ready',
    }).eq('id', adId)

    // Step 3: Subtitle burning (if enabled)
    if (config.subtitleEnabled) {
      await supabase.from('ads').update({ pipeline_step: 'subtitling' }).eq('id', adId)

      try {
        const subtitledFalUrl = await addSubtitles(rawUrl, trace.id)
        const finalUrl = await persistVideo(campaignId, adId, subtitledFalUrl, 'final')

        await supabase.from('ads').update({
          asset_url: finalUrl,
          pipeline_step: 'subtitled',
        }).eq('id', adId)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[SUBTITLE_FAILED] Ad ${adId}: ${msg}`)

        await supabase.from('ads').update({
          pipeline_step: 'subtitle_failed',
          status: 'failed' as const,
        }).eq('id', adId)

        // Don't update campaign to ready — it has a failed ad
        trace.update({ output: { adId, error: msg, step: 'subtitle_failed' } })
        await langfuse.flushAsync()
        throw new Error(`Subtitle burning failed for ad ${adId}: ${msg}`)
      }
    } else {
      // No subtitles — raw video is the final asset
      await supabase.from('ads').update({
        asset_url: rawUrl,
        pipeline_step: 'subtitled', // skip subtitle step
      }).eq('id', adId)
    }

    // Step 4: Mark ready
    await supabase.from('ads').update({
      status: 'ready' as const,
      pipeline_step: 'ready',
    }).eq('id', adId)

    await supabase.from('campaigns').update({ status: 'ready' }).eq('id', campaignId)

    trace.update({ output: { adsGenerated: 1, adId } })
    await langfuse.flushAsync()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // Only set campaign to draft if the ad didn't reach subtitle_failed
    // (subtitle_failed ads have their raw video preserved and can be retried)
    const { data: currentAd } = await supabase.from('ads').select('pipeline_step').eq('id', adId).single()
    if (currentAd?.pipeline_step !== 'subtitle_failed') {
      console.error(`[AD_GEN_FAIL]: ${msg}`)
      trace.update({ output: { adsGenerated: 0, error: msg } })
      await langfuse.flushAsync()
    }
    throw err
  }
}

/**
 * Retry subtitle burning for an ad stuck at subtitle_failed.
 * Uses the already-persisted raw_asset_url.
 */
export async function retrySubtitles(adId: string): Promise<void> {
  const supabase = createAdminClient()

  const { data: ad } = await supabase.from('ads').select().eq('id', adId).single()
  if (!ad) throw new Error('Ad not found')
  if (ad.pipeline_step !== 'subtitle_failed') {
    throw new Error(`Ad is not in subtitle_failed state (current: ${ad.pipeline_step})`)
  }
  if (!ad.raw_asset_url) {
    throw new Error('No raw video URL available for retry')
  }

  await supabase.from('ads').update({
    pipeline_step: 'subtitling',
    status: 'generating' as const,
  }).eq('id', adId)

  try {
    const subtitledFalUrl = await addSubtitles(ad.raw_asset_url)
    const finalUrl = await persistVideo(ad.campaign_id, adId, subtitledFalUrl, 'final')

    await supabase.from('ads').update({
      asset_url: finalUrl,
      pipeline_step: 'ready',
      status: 'ready' as const,
    }).eq('id', adId)

    // Check if all ads for this campaign are now ready
    const { data: allAds } = await supabase.from('ads')
      .select('status')
      .eq('campaign_id', ad.campaign_id)

    const allReady = allAds?.every(a => a.status === 'ready')
    if (allReady) {
      await supabase.from('campaigns').update({ status: 'ready' }).eq('id', ad.campaign_id)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await supabase.from('ads').update({
      pipeline_step: 'subtitle_failed',
      status: 'failed' as const,
    }).eq('id', adId)
    throw new Error(`Subtitle retry failed: ${msg}`)
  }
}
```

Note: We need to import `generateRawVideo` from `fal-client.ts` (currently not exported) — we'll call the raw video generation directly instead of `generateVideoAd` since we're handling subtitles ourselves now.

- [ ] **Step 2: Export `generateRawVideo` from fal-client.ts**

In `src/lib/fal-client.ts`, change:
```typescript
async function generateRawVideo(
```
to:
```typescript
export async function generateRawVideo(
```

Update the import in `ad-generator.ts` to use `generateRawVideo` and `addSubtitles` instead of `generateVideoAd`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ad-generator.ts src/lib/fal-client.ts
git commit -m "feat: pipeline-aware ad generator with asset persistence and subtitle retry"
```

---

## Task 5: Retry Subtitles API Route

**Files:**
- Create: `src/app/api/campaigns/[campaignId]/retry-subtitles/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { retrySubtitles } from '@/lib/ad-generator'

export const maxDuration = 300

export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership
  const { data: campaign } = await supabase
    .from('campaigns')
    .select()
    .eq('id', params.campaignId)
    .eq('user_id', user.id)
    .single()

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  const { adId } = await request.json()
  if (!adId) return NextResponse.json({ error: 'adId is required' }, { status: 400 })

  try {
    await retrySubtitles(adId)
    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/campaigns/[campaignId]/retry-subtitles/route.ts
git commit -m "feat: add retry-subtitles API endpoint"
```

---

## Task 6: Resumable Go Live

**Files:**
- Modify: `src/app/api/campaigns/[campaignId]/go-live/route.ts`

- [ ] **Step 1: Rewrite to be resumable**

The key changes:
- Check if `meta_campaign_id` already exists → reuse it
- Check if `meta_adset_id` already exists → reuse it
- Check if `ad.meta_ad_id` already exists → skip that ad
- Save each Meta ID to DB immediately after creation

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
  createCampaignWithBudget,
  createAdSet,
  createVideoAdCreative,
  createAd,
  uploadAdImage,
  createImageAdCreative,
} from '@/lib/meta-ads'
import type { BrandProfile, AdCopy } from '@/types/database'

export const maxDuration = 120

export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()

  const { data: campaign } = await db
    .from('campaigns')
    .select()
    .eq('id', params.campaignId)
    .eq('user_id', user.id)
    .single()

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  if (campaign.status !== 'ready') {
    return NextResponse.json({ error: 'Campaign is not ready to go live' }, { status: 400 })
  }

  const { data: allAds } = await db
    .from('ads')
    .select()
    .eq('campaign_id', params.campaignId)
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(1)

  if (!allAds || allAds.length === 0) {
    return NextResponse.json({ error: 'No ready ads found' }, { status: 400 })
  }

  const brandProfile = campaign.brand_profile as unknown as BrandProfile
  const adCopy = campaign.ad_copy as unknown as AdCopy

  const headline = adCopy?.headline || brandProfile.product_name
  const primaryText = adCopy?.primaryText || brandProfile.key_value_props.slice(0, 2).join('. ')
  const description = adCopy?.description || 'Learn more'

  try {
    const adSpendCents = Math.round(campaign.daily_budget! * 0.9)
    const USD_TO_INR = 85
    const budgetInAccountCurrency = adSpendCents * USD_TO_INR

    // --- Resumable: reuse existing Meta campaign or create new ---
    let metaCampaignId = campaign.meta_campaign_id
    if (!metaCampaignId) {
      metaCampaignId = await createCampaignWithBudget(
        `Stompads - ${brandProfile.product_name}`,
        budgetInAccountCurrency,
      )
      await db.from('campaigns')
        .update({ meta_campaign_id: metaCampaignId })
        .eq('id', params.campaignId)
    }

    // --- Resumable: reuse existing ad set or create new ---
    let adSetId = campaign.meta_adset_id
    if (!adSetId) {
      adSetId = await createAdSet(metaCampaignId, `${brandProfile.product_name} - Ads`)
      await db.from('campaigns')
        .update({ meta_adset_id: adSetId })
        .eq('id', params.campaignId)
    }

    // --- Resumable: skip ads that already have a meta_ad_id ---
    for (const ad of allAds) {
      if (!ad.asset_url) continue
      if (ad.meta_ad_id) continue

      let creativeId: string

      if (ad.type === 'video') {
        creativeId = await createVideoAdCreative(
          ad.asset_url, headline, primaryText, description, campaign.url
        )
      } else {
        const imageHash = await uploadAdImage(ad.asset_url)
        creativeId = await createImageAdCreative(
          imageHash, headline, primaryText, description, campaign.url
        )
      }

      // Save creative ID immediately
      await db.from('ads')
        .update({ meta_creative_id: creativeId })
        .eq('id', ad.id)

      const metaAdId = await createAd(
        adSetId, creativeId,
        `${brandProfile.product_name} - ${ad.type} ${ad.aspect_ratio}`
      )

      // Save ad ID immediately
      await db.from('ads')
        .update({ meta_ad_id: metaAdId, status: 'live' })
        .eq('id', ad.id)
    }

    await db.from('campaigns')
      .update({ status: 'live' })
      .eq('id', params.campaignId)

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Meta campaign launch error:', msg)
    return NextResponse.json({ error: `Failed to launch Meta campaign: ${msg}` }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/campaigns/[campaignId]/go-live/route.ts
git commit -m "feat: make Go Live resumable — reuse existing Meta IDs on retry"
```

---

## Task 7: Update Process Route

**Files:**
- Modify: `src/app/api/campaigns/[campaignId]/process/route.ts`

- [ ] **Step 1: Handle subtitle_failed as a partial-success state**

When `generateCampaignAds` throws due to subtitle failure, the campaign should NOT be reset to `draft`. The ad exists with `pipeline_step: 'subtitle_failed'` and can be retried. Update the `fail` function and the ad generation catch block:

In the catch block for Step 6 (generate ads), change from resetting to draft:

```typescript
  // Step 6: Generate ads
  try {
    await generateCampaignAds(params.campaignId, brandProfile)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ad generation failed'

    // Check if this is a subtitle failure (ad exists but subtitles failed)
    // In that case, don't reset to draft — the ad's raw video is preserved
    const { data: existingAds } = await adminClient
      .from('ads')
      .select('pipeline_step')
      .eq('campaign_id', params.campaignId)

    const hasSubtitleFailure = existingAds?.some(a => a.pipeline_step === 'subtitle_failed')

    if (hasSubtitleFailure) {
      // Don't reset campaign — let frontend show retry UI
      trace.update({ output: { campaignId: params.campaignId, subtitleFailed: true } })
      await langfuse.flushAsync()
      return NextResponse.json({
        status: 'subtitle_failed',
        error: msg,
        brandProfile,
        adCopy,
        brandAssets: storedAssets,
        ads: existingAds || [],
      })
    }

    await fail('AD_GENERATION_FAILED', msg)
    return NextResponse.json({ error: `Ad generation failed: ${msg}`, code: 'AD_GENERATION_FAILED' }, { status: 500 })
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/campaigns/[campaignId]/process/route.ts
git commit -m "feat: process route handles subtitle_failed as partial success"
```

---

## Task 8: Campaign Detail Page — Subtitle Failure UI

**Files:**
- Modify: `src/app/(app)/dashboard/[campaignId]/page.tsx`

- [ ] **Step 1: Add RetrySubtitlesButton component and subtitle failure state**

Add a client component for the retry button (inline in the file or as a separate component). Detect ads with `pipeline_step === 'subtitle_failed'` and show retry UI.

After the existing imports, add:

```typescript
import RetrySubtitlesButton from './RetrySubtitlesButton'
```

In the JSX, after the `{/* Ready — go live */}` section, add:

```tsx
{/* Subtitle failed — show retry */}
{ads?.some(a => a.pipeline_step === 'subtitle_failed') && (
  <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--red)', fontWeight: 600 }}>
      CAPTION BURNING FAILED
    </p>
    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
      Your video was generated successfully but captions could not be added. Retry below.
    </p>
    {ads.filter(a => a.pipeline_step === 'subtitle_failed').map(ad => (
      <RetrySubtitlesButton key={ad.id} campaignId={params.campaignId} adId={ad.id} />
    ))}
  </div>
)}
```

- [ ] **Step 2: Create RetrySubtitlesButton component**

Create `src/app/(app)/dashboard/[campaignId]/RetrySubtitlesButton.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RetrySubtitlesButton({ campaignId, adId }: { campaignId: string; adId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleRetry() {
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/campaigns/${campaignId}/retry-subtitles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adId }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Retry failed')
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <div style={{ marginTop: '12px' }}>
      <button onClick={handleRetry} disabled={loading} className="btn-primary">
        {loading ? 'RETRYING CAPTIONS...' : 'RETRY CAPTIONS'}
      </button>
      {error && <div className="error-box" style={{ marginTop: '8px' }}>{error}</div>}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/dashboard/[campaignId]/page.tsx src/app/(app)/dashboard/[campaignId]/RetrySubtitlesButton.tsx
git commit -m "feat: subtitle failure UI with retry button on campaign detail page"
```

---

## Task 9: Update Onboard Polling to Handle subtitle_failed

**Files:**
- Modify: `src/app/(app)/onboard/page.tsx`

- [ ] **Step 1: Handle subtitle_failed in pollStatus callback**

In the `pollStatus` function, add handling for the `subtitle_failed` status. When detected, stop polling and redirect to the campaign detail page where the retry UI lives:

```typescript
// After the existing draft check, add:
if (data.status === 'subtitle_failed' || data.ads?.some((a: Ad) => a.pipeline_step === 'subtitle_failed')) {
  if (pollingRef.current) clearInterval(pollingRef.current)
  if (progressRef.current) clearInterval(progressRef.current)
  if (waitCopyRef.current) clearInterval(waitCopyRef.current)
  // Redirect to campaign page which has the retry UI
  router.push(`/dashboard/${id}`)
  return
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(app)/onboard/page.tsx
git commit -m "feat: onboard polling redirects to dashboard on subtitle failure"
```

---

## Task 10: Build Verification

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Run lint**

```bash
npx next lint
```

Expected: no errors.

- [ ] **Step 3: Run production build**

```bash
npx next build
```

Expected: all routes compile successfully.

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: resolve build issues from pipeline robustness changes"
```
