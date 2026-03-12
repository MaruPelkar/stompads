'use client'

import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { UrlForm } from '@/components/onboard/UrlForm'
import { BrandProfileCard } from '@/components/onboard/BrandProfileCard'
import { AdPreview } from '@/components/onboard/AdPreview'
import { BudgetForm } from '@/components/onboard/BudgetForm'
import type { BrandProfile, Ad, AdCopy } from '@/types/database'

type Step = 'url' | 'generating' | 'preview' | 'checkout'

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
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null)
  const [adCopy, setAdCopy] = useState<AdCopy | null>(null)
  const [ads, setAds] = useState<Ad[]>([])
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('Analyzing your site...')
  const searchParams = useSearchParams()
  const autoStarted = useRef(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const pollStatus = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/campaigns/${id}/status`)
      if (!res.ok) return

      const data = await res.json()

      if (data.brandProfile && !brandProfile) {
        setBrandProfile(data.brandProfile)
        setAdCopy(data.adCopy)
        setStatusMessage('Generating your video ads...')
      }

      if (data.status === 'ready' && data.ads?.length > 0) {
        if (pollingRef.current) clearInterval(pollingRef.current)
        setBrandProfile(data.brandProfile)
        setAdCopy(data.adCopy)
        setAds(data.ads)
        setStep('preview')
      } else if (data.status === 'draft') {
        if (pollingRef.current) clearInterval(pollingRef.current)
        setError('Campaign generation failed. Please try again.')
        setStep('url')
      }
    } catch {
      // Network error — keep polling
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandProfile])

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
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
    setStatusMessage('Analyzing your site...')
    setBrandProfile(null)
    setAdCopy(null)
    setAds([])

    // Step 1: Create campaign (fast — returns immediately)
    const createRes = await fetch('/api/campaigns/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    const createData = await createRes.json()

    if (!createRes.ok) {
      setError(`${createData.error || 'Failed to start campaign'}${createData.code ? ` [${createData.code}]` : ''}`)
      setStep('url')
      return
    }

    const id = createData.campaignId
    setCampaignId(id)

    // Step 2: Start polling for status updates
    pollingRef.current = setInterval(() => pollStatus(id), 3000)

    // Step 3: Fire off processing (this takes 1-3 minutes)
    // We don't await this — the polling will pick up when it's done
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
        <div className="text-center py-16">
          <div className="inline-block w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: 'var(--orange)', borderTopColor: 'transparent' }} />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '18px', color: 'var(--text)' }}>{statusMessage}</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>This takes 1-2 minutes</p>

          {brandProfile && (
            <div className="mt-8 text-left max-w-2xl mx-auto">
              <BrandProfileCard profile={brandProfile} adCopy={adCopy} />
            </div>
          )}
        </div>
      )}

      {step === 'preview' && brandProfile && (
        <>
          <BrandProfileCard profile={brandProfile} adCopy={adCopy} />
          <AdPreview ads={ads} />
          <BudgetForm onSubmit={handleBudgetSubmit} loading={false} />
        </>
      )}

      {step === 'checkout' && (
        <div className="text-center py-16">
          <div className="inline-block w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent' }} />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '18px', color: 'var(--text)' }}>Redirecting to payment...</p>
        </div>
      )}

      {error && (
        <div style={{ background: 'var(--red-soft)', border: '1px solid var(--red)', borderRadius: '6px', padding: '12px 16px', color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
          {error}
        </div>
      )}
    </div>
  )
}
