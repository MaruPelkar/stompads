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
      setError(data.error || 'Failed to analyze URL')
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
          <div className="inline-block w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400 text-lg">Analyzing your site & generating ads...</p>
          <p className="text-gray-600 text-sm mt-2">This takes about 60 seconds</p>
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
          <div className="inline-block w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400 text-lg">Redirecting to payment...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
