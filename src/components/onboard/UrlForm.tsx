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
    <div className="text-center space-y-6">
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '48px', letterSpacing: '1px', color: 'var(--text)' }}>
          ENTER YOUR <span style={{ color: 'var(--orange)' }}>URL</span>
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '8px' }}>
          We&apos;ll analyze your site and build your ad campaign automatically.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-3 max-w-xl mx-auto">
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="yourwebsite.com"
          required
          className="flex-1 px-4 py-3 outline-none transition"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: '14px', caretColor: 'var(--orange)' }}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 transition whitespace-nowrap disabled:opacity-50"
          style={{ background: 'var(--orange)', color: '#fff', fontFamily: 'var(--font-display)', fontSize: '16px', letterSpacing: '2px', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}
        >
          {loading ? 'ANALYZING...' : 'ANALYZE SITE'}
        </button>
      </form>
    </div>
  )
}
