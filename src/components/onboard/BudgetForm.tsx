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
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-lg">Set your daily budget</h3>
        <p className="text-gray-400 text-sm mt-1">You&apos;ll be charged for the first day before we generate your full campaign.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-sm text-gray-400 mb-1">Daily budget (USD)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
            <input
              type="number"
              value={budget}
              onChange={e => setBudget(e.target.value)}
              min="5"
              step="1"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-4 py-3 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-lg transition"
        >
          {loading ? 'Processing...' : 'Generate full campaign \u2192'}
        </button>
      </form>
    </div>
  )
}
