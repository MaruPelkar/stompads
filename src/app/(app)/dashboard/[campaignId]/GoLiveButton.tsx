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
        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl text-lg transition"
      >
        {loading ? 'Launching campaign...' : 'Go Live -- Get Traffic'}
      </button>
      {error && <p className="text-red-400 text-sm text-center">{error}</p>}
    </div>
  )
}
