'use client'

import { useState } from 'react'

interface Props {
  onSubmit: (dailyBudgetCents: number) => void
  loading: boolean
}

export function BudgetForm({ onSubmit, loading }: Props) {
  const [budget, setBudget] = useState('50')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const val = parseInt(budget) || 0
    if (val < 10 || val > 10000) {
      setError('Enter a number between $10 and $10,000')
      return
    }
    setError(null)
    onSubmit(val * 100)
  }

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <h3 className="heading-md">DAILY <span style={{ color: 'var(--orange)' }}>BUDGET</span></h3>

      <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <span style={{
            position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
            fontFamily: 'var(--font-display)', fontSize: '32px', color: 'var(--text-muted)',
          }}>$</span>
          <input
            type="number"
            value={budget}
            onChange={(e) => { setBudget(e.target.value); setError(null) }}
            placeholder="50"
            min={10}
            max={10000}
            step={10}
            required
            className="input"
            style={{
              width: '200px', textAlign: 'center',
              fontFamily: 'var(--font-display)', fontSize: '36px',
              letterSpacing: '2px', padding: '12px 16px 12px 40px',
            }}
          />
        </div>

        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)',
          letterSpacing: '0.5px', marginTop: '8px',
        }}>
          Enter a number between $10 to $10K
        </p>

        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)',
          letterSpacing: '0.5px', marginTop: '4px',
        }}>
          We take a 10% cut as a publishing platform.
        </p>

        {error && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--red)', marginTop: '8px' }}>{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '20px', width: '100%' }}>
          {loading ? 'PROCESSING...' : 'CONFIRM & LAUNCH'}
        </button>
      </form>
    </div>
  )
}
