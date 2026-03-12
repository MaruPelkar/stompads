'use client'

import { useState } from 'react'

interface Props {
  onSubmit: (dailyBudgetCents: number) => void
  loading: boolean
}

export function BudgetForm({ onSubmit, loading }: Props) {
  const [budget, setBudget] = useState('20')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cents = Math.round(parseFloat(budget) * 100)
    onSubmit(cents)
  }

  return (
    <div className="card">
      <h3 className="heading-md">SET YOUR <span style={{ color: 'var(--orange)' }}>BUDGET</span></h3>
      <p className="label" style={{ marginTop: '6px' }}>First day charged upfront. Cancel anytime.</p>
      <form onSubmit={handleSubmit} className="flex gap-3 items-end mt-4">
        <div className="flex-1">
          <label className="label">Daily budget (USD)</label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>$</span>
            <input
              type="number" value={budget} onChange={e => setBudget(e.target.value)}
              min="5" step="1" required
              className="input" style={{ paddingLeft: '28px' }}
            />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary" style={{ whiteSpace: 'nowrap', fontSize: '16px', padding: '14px 28px' }}>
          {loading ? 'PROCESSING...' : 'CONFIRM & LAUNCH'}
        </button>
      </form>
    </div>
  )
}
