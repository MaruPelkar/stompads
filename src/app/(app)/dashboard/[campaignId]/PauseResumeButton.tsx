'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PauseResumeButton({ campaignId, currentStatus }: { campaignId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const isLive = status === 'live'
  const isPaused = status === 'paused'

  if (!isLive && !isPaused) return null

  async function handleToggle() {
    setLoading(true)
    setError(null)

    const action = isLive ? 'pause' : 'resume'
    const res = await fetch(`/api/campaigns/${campaignId}/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || `Failed to ${action}`)
      setLoading(false)
      return
    }

    // Update local status immediately, then refresh server data
    setStatus(isLive ? 'paused' : 'live')
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <button onClick={handleToggle} disabled={loading}
        className={isLive ? 'btn-ghost w-full' : 'btn-primary w-full'}
        style={isLive ? { color: 'var(--red)' } : {}}>
        {loading
          ? (isLive ? 'PAUSING...' : 'RESUMING...')
          : (isLive ? 'PAUSE ADS' : 'RESUME ADS')
        }
      </button>
      {error && <div className="error-box text-center">{error}</div>}
    </div>
  )
}
