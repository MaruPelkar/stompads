'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function GoLiveButton({ campaignId }: { campaignId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleGoLive() {
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/campaigns/${campaignId}/go-live`, { method: 'POST' })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Failed to go live')
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <div className="space-y-2">
      <button onClick={handleGoLive} disabled={loading} className="btn-primary w-full"
        style={{ fontSize: '22px', padding: '18px', letterSpacing: '3px' }}>
        {loading ? 'LAUNCHING...' : 'GO LIVE'}
      </button>
      {error && <div className="error-box text-center">{error}</div>}
    </div>
  )
}
