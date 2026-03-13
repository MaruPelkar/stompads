'use client'

import { useState } from 'react'
import { BudgetForm } from '@/components/onboard/BudgetForm'

export default function ResumeCheckout({ campaignId }: { campaignId: string }) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleBudgetSubmit(dailyBudgetCents: number) {
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/campaigns/${campaignId}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dailyBudgetCents }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Payment failed')
      setLoading(false)
      return
    }

    window.location.href = data.checkoutUrl
  }

  return (
    <div className="space-y-3">
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--orange)', letterSpacing: '0.5px', fontWeight: 600 }}>
        Ads ready. Set budget to continue.
      </p>
      <BudgetForm onSubmit={handleBudgetSubmit} loading={loading} />
      {error && <div className="error-box">{error}</div>}
    </div>
  )
}
