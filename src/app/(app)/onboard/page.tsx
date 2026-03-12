'use client'

import { useState } from 'react'
import { UrlForm } from '@/components/onboard/UrlForm'
import { BrandProfileCard } from '@/components/onboard/BrandProfileCard'
import { AdPreview } from '@/components/onboard/AdPreview'
import { BudgetForm } from '@/components/onboard/BudgetForm'
import type { BrandProfile, Ad, AdCopy } from '@/types/database'

type Step = 'url' | 'generating' | 'preview' | 'checkout'

export default function OnboardPage() {
  const [step, setStep] = useState<Step>('url')
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null)
  const [adCopy, setAdCopy] = useState<AdCopy | null>(null)
  const [ads, setAds] = useState<Ad[]>([])
  const [error, setError] = useState<string | null>(null)

  async function handleUrlSubmit(url: string) {
    setStep('generating')
    setError(null)

    const res = await fetch('/api/campaigns/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(`${data.error || 'Failed to analyze URL'}${data.code ? ` [${data.code}]` : ''}`)
      setStep('url')
      return
    }

    setCampaignId(data.campaignId)
    setBrandProfile(data.brandProfile)
    setAdCopy(data.adCopy)
    setAds(data.ads || [])
    setStep('preview')
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
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '18px', color: 'var(--text)' }}>Analyzing your site & generating ads...</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>This takes about 60 seconds</p>
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
