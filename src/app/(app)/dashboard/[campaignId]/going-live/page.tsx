'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const GO_LIVE_STEPS = [
  { key: 'campaign', label: 'Creating your Meta campaign' },
  { key: 'adset', label: 'Setting up targeting & budget' },
  { key: 'upload', label: 'Uploading your video to Meta' },
  { key: 'creative', label: 'Building ad creative' },
  { key: 'launch', label: 'Launching your ad' },
]

const GO_LIVE_COPY = [
  "Your ad is about to reach thousands.",
  "Setting everything up. No shortcuts.",
  "Every detail matters. We check twice.",
  "Almost there. Your traffic is incoming.",
  "The hard part is done. Now we deliver.",
  "Meta is processing. Standby.",
]

export default function GoingLivePage({ params }: { params: { campaignId: string } }) {
  const router = useRouter()
  const [stepIndex, setStepIndex] = useState(0)
  const [copyIndex, setCopyIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const launched = useRef(false)

  // Simulate step progress
  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex(prev => prev < GO_LIVE_STEPS.length - 1 ? prev + 1 : prev)
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  // Rotate copy
  useEffect(() => {
    const interval = setInterval(() => {
      setCopyIndex(prev => (prev + 1) % GO_LIVE_COPY.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Trigger go-live API
  useEffect(() => {
    if (launched.current) return
    launched.current = true

    async function goLive() {
      const res = await fetch(`/api/campaigns/${params.campaignId}/go-live`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to launch')
        return
      }

      setStepIndex(GO_LIVE_STEPS.length - 1)
      setDone(true)

      // Redirect to campaign page after brief celebration
      setTimeout(() => {
        router.replace(`/dashboard/${params.campaignId}`)
      }, 2000)
    }

    goLive()
  }, [params.campaignId, router])

  return (
    <div className="text-center py-12">
      {/* Header */}
      {!done ? (
        <h1 className="heading-xl">GOING <span style={{ color: 'var(--orange)' }}>LIVE</span></h1>
      ) : (
        <h1 className="heading-xl" style={{ color: 'var(--green)' }}>LIVE</h1>
      )}

      {!done && <div className="spinner" style={{ margin: '24px auto' }} />}

      {done && (
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--green)',
          marginTop: '16px', letterSpacing: '1px',
        }}>
          YOUR AD IS RUNNING
        </p>
      )}

      {/* Progress steps */}
      <div style={{ maxWidth: '340px', margin: '24px auto 0', textAlign: 'left' }}>
        {GO_LIVE_STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-3" style={{ padding: '7px 0' }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 700,
              background: (done || i < stepIndex) ? 'var(--green)' : i === stepIndex ? 'var(--orange)' : 'var(--input-bg)',
              color: (done || i <= stepIndex) ? '#fff' : 'var(--text-muted)',
              transition: 'all 400ms ease',
            }}>
              {(done || i < stepIndex) ? '✓' : ''}
            </div>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.5px',
              color: (done || i <= stepIndex) ? 'var(--text)' : 'var(--text-muted)',
              fontWeight: (!done && i === stepIndex) ? 600 : 400,
              transition: 'all 400ms ease',
            }}>
              {s.label}{!done && i === stepIndex ? '...' : ''}
            </span>
          </div>
        ))}
      </div>

      {/* Rotating copy */}
      {!done && !error && (
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-light)',
          marginTop: '24px', maxWidth: '340px', marginLeft: 'auto', marginRight: 'auto',
          minHeight: '42px', lineHeight: 1.5,
        }}>
          {GO_LIVE_COPY[copyIndex]}
        </p>
      )}

      {/* Error */}
      {error && (
        <div style={{ marginTop: '24px' }}>
          <div className="error-box" style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'left' }}>{error}</div>
          <button
            onClick={() => { launched.current = false; setError(null); setStepIndex(0); }}
            className="btn-primary" style={{ marginTop: '16px' }}
          >
            RETRY
          </button>
        </div>
      )}
    </div>
  )
}
