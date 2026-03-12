'use client'

import { useState } from 'react'
import { UrlForm } from '@/components/onboard/UrlForm'
import { BrandProfileCard } from '@/components/onboard/BrandProfileCard'
import { AdPreview } from '@/components/onboard/AdPreview'
import { BudgetForm } from '@/components/onboard/BudgetForm'
import type { BrandProfile, Ad } from '@/types/database'

type Step = 'url' | 'profiling' | 'generating_preview' | 'preview' | 'budget' | 'generating_full'

export default function OnboardPage() {
  const [step, setStep] = useState<Step>('url')
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null)
  const [previewAds, setPreviewAds] = useState<Ad[]>([])
  const [error, setError] = useState<string | null>(null)

  async function handleUrlSubmit(url: string) {
    setStep('profiling')
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
    setStep('generating_preview')

    // Trigger preview ad generation
    const genRes = await fetch(`/api/campaigns/${data.campaignId}/generate-preview`, {
      method: 'POST',
    })

    if (!genRes.ok) {
      setError('Failed to generate preview ads')
      setStep('preview')
      return
    }

    // Fetch the generated preview ads
    const adsRes = await fetch(`/api/campaigns/${data.campaignId}/ads?preview=true`)
    const adsData = await adsRes.json()
    setPreviewAds(adsData.ads || [])
    setStep('preview')
  }

  async function handleBudgetSubmit(dailyBudgetCents: number) {
    if (!campaignId) return
    setStep('generating_full')

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

    // Redirect to Stripe checkout
    window.location.href = data.checkoutUrl
  }

  return (
    <div className="space-y-8">
      {step === 'url' && (
        <UrlForm onSubmit={handleUrlSubmit} loading={false} />
      )}

      {(step === 'profiling' || step === 'generating_preview') && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400">
            {step === 'profiling' ? 'Analyzing your website...' : 'Generating your preview ads...'}
          </p>
        </div>
      )}

      {(step === 'preview' || step === 'budget' || step === 'generating_full') && brandProfile && (
        <>
          <BrandProfileCard profile={brandProfile} />
          <AdPreview ads={previewAds} generating={false} />
          {step === 'preview' && (
            <BudgetForm onSubmit={handleBudgetSubmit} loading={false} />
          )}
          {step === 'generating_full' && (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-400">Generating your full campaign...</p>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
