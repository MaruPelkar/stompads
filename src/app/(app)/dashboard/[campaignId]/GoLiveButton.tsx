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
      <button
        onClick={handleGoLive}
        disabled={loading}
        className="w-full py-4 text-lg transition disabled:opacity-50"
        style={{
          background: 'var(--orange)',
          color: '#fff',
          fontFamily: 'var(--font-display)',
          fontSize: '22px',
          letterSpacing: '3px',
          textTransform: 'uppercase',
          border: 'none',
          cursor: loading ? 'wait' : 'pointer',
          boxShadow: '0 4px 24px rgba(255, 77, 0, 0.25)',
        }}
      >
        {loading ? 'LAUNCHING CAMPAIGN...' : 'GO LIVE — GET TRAFFIC'}
      </button>
      {error && <p style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: '12px', textAlign: 'center' }}>{error}</p>}
    </div>
  )
}
