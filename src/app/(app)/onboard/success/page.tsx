'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  )
}

function SuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const campaignId = searchParams.get('campaign_id')

  useEffect(() => {
    if (campaignId) {
      // Redirect to go-live page immediately
      router.replace(`/dashboard/${campaignId}/going-live`)
    }
  }, [campaignId, router])

  return (
    <div className="text-center py-16 space-y-6">
      <div className="spinner" style={{ margin: '0 auto' }} />
      <h1 className="heading-xl" style={{ color: 'var(--green)' }}>CONFIRMED</h1>
      <p className="label" style={{ fontSize: '13px' }}>Payment received. Launching your ads now...</p>
    </div>
  )
}
