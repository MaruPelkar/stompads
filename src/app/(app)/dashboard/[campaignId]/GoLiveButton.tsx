'use client'

import { useRouter } from 'next/navigation'

export default function GoLiveButton({ campaignId }: { campaignId: string }) {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push(`/dashboard/${campaignId}/going-live`)}
      className="btn-primary w-full"
      style={{ fontSize: '22px', padding: '18px', letterSpacing: '3px' }}
    >
      GO LIVE
    </button>
  )
}
