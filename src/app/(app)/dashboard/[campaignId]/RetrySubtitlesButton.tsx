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
