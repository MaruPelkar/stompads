'use client'

import { useState } from 'react'

interface Props {
  onSubmit: (url: string) => void
  loading: boolean
}

export function UrlForm({ onSubmit, loading }: Props) {
  const [url, setUrl] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const normalized = url.startsWith('http') ? url : `https://${url}`
    onSubmit(normalized)
  }

  return (
    <div className="text-center space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-3">Enter your website URL</h1>
        <p className="text-gray-400 text-lg">We&apos;ll analyze your site and build your ad campaign automatically.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-3 max-w-xl mx-auto">
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="yourwebsite.com"
          required
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-lg transition whitespace-nowrap"
        >
          {loading ? 'Analyzing...' : 'Analyze site \u2192'}
        </button>
      </form>
    </div>
  )
}
