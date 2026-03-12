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
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '24px' }}>
      <div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '1px', color: 'var(--text)' }}>SET YOUR <span style={{ color: 'var(--orange)' }}>BUDGET</span></h3>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>You&apos;ll be charged for the first day before we launch.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-3 items-end mt-4">
        <div className="flex-1">
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-muted)' }}>Daily budget (USD)</label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>$</span>
            <input
              type="number"
              value={budget}
              onChange={e => setBudget(e.target.value)}
              min="5"
              step="1"
              required
              className="w-full pl-7 pr-4 py-3 outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: '14px' }}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 transition disabled:opacity-50"
          style={{ background: 'var(--orange)', color: '#fff', fontFamily: 'var(--font-display)', fontSize: '16px', letterSpacing: '2px', textTransform: 'uppercase', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          {loading ? 'PROCESSING...' : 'PAY & LAUNCH'}
        </button>
      </form>
    </div>
  )
}
