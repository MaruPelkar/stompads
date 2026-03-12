'use client'

import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
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
  const searchParams = useSearchParams()
  const autoStarted = useRef(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const pollStatus = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/campaigns/${id}/status`)
      if (!res.ok) return

      const data = await res.json()

      if (data.brandProfile && !hasProfile) {
        setHasProfile(true)
        setProgressIndex(3) // Jump to "Generating video 1"
      }

      if (data.status === 'ready' && data.ads?.length > 0) {
        if (pollingRef.current) clearInterval(pollingRef.current)
        if (progressRef.current) clearInterval(progressRef.current)
        setAds(data.ads)
        setStep('preview')
      } else if (data.status === 'draft') {
        if (pollingRef.current) clearInterval(pollingRef.current)
        if (progressRef.current) clearInterval(progressRef.current)
        setError('Campaign generation failed. Please try again.')
        setStep('url')
      }
    } catch {
      // Keep polling
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasProfile])

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
    pollingRef.current = setInterval(() => pollStatus(id), 3000)

    fetch(`/api/campaigns/${id}/process`, { method: 'POST' }).catch(err => {
      console.error('Process call failed:', err)
    })
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
