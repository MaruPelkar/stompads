'use client'

import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UrlForm } from '@/components/onboard/UrlForm'
import { AdPreview } from '@/components/onboard/AdPreview'
import { BudgetForm } from '@/components/onboard/BudgetForm'
import type { Ad } from '@/types/database'

type Step = 'url' | 'generating' | 'preview' | 'checkout'

const PROGRESS_STEPS = [
  { key: 'scrape', label: 'Scanning your website' },
  { key: 'profile', label: 'Locking in your brand' },
  { key: 'scripts', label: 'Writing ad scripts' },
  { key: 'video1', label: 'Producing video 1' },
  { key: 'video2', label: 'Producing video 2' },
  { key: 'subtitles', label: 'Burning in captions' },
]

export default function OnboardPage() {
  return (
    <Suspense>
      <OnboardContent />
    </Suspense>
  )
}

function OnboardContent() {
  const [step, setStep] = useState<Step>('url')
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [hasProfile, setHasProfile] = useState(false)
  const [ads, setAds] = useState<Ad[]>([])
  const [error, setError] = useState<string | null>(null)
  const [progressIndex, setProgressIndex] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const autoStarted = useRef(false)

  // Check admin status (server enforces this — client check is just for UI)
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      // Quick admin check — the skip-payment API does the real auth server-side
      if (user?.email && (user.email === 'nakul@vaaya.ai' || user.email.endsWith('@stompads.com'))) {
        setIsAdmin(true)
      }
    })
  }, [])
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const pollStatus = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/campaigns/${id}/status`)
      if (!res.ok) return

      const data = await res.json()

      // Update progress based on actual state
      if (data.brandProfile && !hasProfile) {
        setHasProfile(true)
        setProgressIndex(3) // Jump to "Producing video 1"
      }

      // Check if ads are appearing (sequential generation saves each immediately)
      const adCount = data.ads?.length || 0
      if (adCount >= 1 && progressIndex < 4) {
        setProgressIndex(4) // "Producing video 2"
      }
      if (adCount >= 2 && progressIndex < 5) {
        setProgressIndex(5) // "Burning in captions"
      }

      if (data.status === 'ready' && adCount > 0) {
        if (pollingRef.current) clearInterval(pollingRef.current)
        if (progressRef.current) clearInterval(progressRef.current)
        setAds(data.ads)
        setStep('preview')
      } else if (data.status === 'draft') {
        if (pollingRef.current) clearInterval(pollingRef.current)
        if (progressRef.current) clearInterval(progressRef.current)
        // If we have some ads, still show them
        if (adCount > 0) {
          setAds(data.ads)
          setStep('preview')
        } else {
          setError('Campaign generation failed. Please try again.')
          setStep('url')
        }
      }
    } catch {
      // Keep polling
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasProfile, progressIndex])

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      if (progressRef.current) clearInterval(progressRef.current)
    }
  }, [])

  useEffect(() => {
    const urlParam = searchParams.get('url')
    if (urlParam && !autoStarted.current) {
      autoStarted.current = true
      handleUrlSubmit(urlParam)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  async function handleUrlSubmit(url: string) {
    setStep('generating')
    setError(null)
    setProgressIndex(0)
    setHasProfile(false)
    setAds([])

    // Simulate progress through steps (actual progress comes from polling)
    progressRef.current = setInterval(() => {
      setProgressIndex(prev => prev < PROGRESS_STEPS.length - 1 ? prev + 1 : prev)
    }, 12000) // Advance every 12s

    const createRes = await fetch('/api/campaigns/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    const createData = await createRes.json()

    if (!createRes.ok) {
      if (progressRef.current) clearInterval(progressRef.current)
      setError(`${createData.error || 'Failed to start campaign'}${createData.code ? ` [${createData.code}]` : ''}`)
      setStep('url')
      return
    }

    const id = createData.campaignId
    setCampaignId(id)

    // Processing is triggered server-side by /create — just poll for status
    pollingRef.current = setInterval(() => pollStatus(id), 3000)
  }

  async function handleBudgetSubmit(dailyBudgetCents: number) {
    if (!campaignId) return
    setStep('checkout')

    const res = await fetch(`/api/campaigns/${campaignId}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dailyBudgetCents }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Payment failed')
      setStep('preview')
      return
    }

    window.location.href = data.checkoutUrl
  }

  async function handleSkipPayment() {
    if (!campaignId) return
    const res = await fetch(`/api/campaigns/${campaignId}/skip-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dailyBudgetCents: 1000 }),
    })
    if (res.ok) {
      router.push(`/dashboard/${campaignId}`)
    } else {
      const data = await res.json()
      setError(data.error || 'Skip failed')
    }
  }

  return (
    <div className="space-y-8">
      {step === 'url' && (
        <UrlForm onSubmit={handleUrlSubmit} loading={false} />
      )}

      {step === 'generating' && (
        <div className="text-center py-12">
          <div className="spinner mb-6" />

          {/* Progress steps */}
          <div style={{ maxWidth: '320px', margin: '0 auto', textAlign: 'left' }}>
            {PROGRESS_STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center gap-3" style={{ padding: '8px 0' }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700,
                  background: i < progressIndex ? 'var(--green)' : i === progressIndex ? 'var(--orange)' : 'var(--input-bg)',
                  color: i <= progressIndex ? '#fff' : 'var(--text-muted)',
                  transition: 'all 400ms ease',
                }}>
                  {i < progressIndex ? '✓' : ''}
                </div>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.5px',
                  color: i <= progressIndex ? 'var(--text)' : 'var(--text-muted)',
                  fontWeight: i === progressIndex ? 600 : 400,
                  transition: 'all 400ms ease',
                }}>
                  {s.label}{i === progressIndex ? '...' : ''}
                </span>
              </div>
            ))}
          </div>

          {/* Brand profile loaded — videos still generating */}
          {hasProfile && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text)', marginTop: '20px', letterSpacing: '0.5px', fontWeight: 600 }}>
              Understood. Creating your ads now.
            </p>
          )}
        </div>
      )}

      {step === 'preview' && ads.length > 0 && (
        <>
          <AdPreview ads={ads} />
          <BudgetForm onSubmit={handleBudgetSubmit} loading={false} />
          {isAdmin && (
            <button onClick={handleSkipPayment} className="btn-ghost w-full"
              style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '-8px' }}>
              SKIP PAYMENT (ADMIN TEST)
            </button>
          )}
        </>
      )}

      {step === 'checkout' && (
        <div className="text-center py-16">
          <div className="spinner mb-4" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent' }} />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '18px', color: 'var(--text)' }}>Redirecting to payment...</p>
        </div>
      )}

      {error && <div className="error-box">{error}</div>}
    </div>
  )
}
