'use client'

import { useState } from 'react'

interface Props {
  onSubmit: (dailyBudgetCents: number) => void
  loading: boolean
}

export function BudgetForm({ onSubmit, loading }: Props) {
  const [budget, setBudget] = useState(50)

  function handleSliderChange(val: number) {
    setBudget(val)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value) || 0
    setBudget(Math.min(10000, Math.max(0, val)))
  }

  function handleInputBlur() {
    // Clamp to valid range on blur
    setBudget(Math.min(10000, Math.max(10, budget)))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const clamped = Math.min(10000, Math.max(10, budget))
    onSubmit(clamped * 100) // convert to cents
  }

  const sliderPercent = ((budget - 10) / (10000 - 10)) * 100

  return (
    <div className="card">
      <h3 className="heading-md">SET YOUR <span style={{ color: 'var(--orange)' }}>BUDGET</span></h3>
      <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
        {/* Budget display: slider + input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <input
              type="range"
              min={10}
              max={10000}
              step={10}
              value={budget}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              style={{
                WebkitAppearance: 'none', appearance: 'none',
                width: '100%', height: '4px', outline: 'none', cursor: 'pointer',
                background: `linear-gradient(to right, var(--orange) 0%, var(--orange) ${sliderPercent}%, var(--slider-track) ${sliderPercent}%, var(--slider-track) 100%)`,
                borderRadius: '2px',
              }}
            />
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)',
              letterSpacing: '1px', marginTop: '4px',
            }}>
              <span>$10/day</span>
              <span>$10,000/day</span>
            </div>
          </div>

          {/* Editable input */}
          <div style={{ position: 'relative', width: '120px', flexShrink: 0 }}>
            <span style={{
              position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
              fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--text-muted)',
            }}>$</span>
            <input
              type="number"
              value={budget}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              min={10}
              max={10000}
              className="input"
              style={{
                paddingLeft: '28px', textAlign: 'right',
                fontFamily: 'var(--font-display)', fontSize: '22px',
                letterSpacing: '1px', padding: '10px 12px 10px 28px',
              }}
            />
            <span style={{
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)',
              letterSpacing: '0.5px', pointerEvents: 'none',
            }}>/day</span>
          </div>
        </div>

        {/* 10% platform fee note */}
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)',
          letterSpacing: '0.5px', marginTop: '12px',
        }}>
          We take a 10% cut as a publishing platform.
        </p>

        {/* Submit */}
        <button type="submit" disabled={loading} className="btn-primary w-full" style={{ marginTop: '16px' }}>
          {loading ? 'PROCESSING...' : 'CONFIRM & LAUNCH'}
        </button>
      </form>
    </div>
  )
}
