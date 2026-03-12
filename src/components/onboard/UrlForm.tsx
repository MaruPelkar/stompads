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
        <h1 className="heading-xl">ENTER YOUR <span style={{ color: 'var(--orange)' }}>URL</span></h1>
        <p className="label" style={{ fontSize: '12px', marginTop: '10px', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
          We&apos;ll analyze your site and generate video ads automatically.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-3 max-w-xl mx-auto">
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="yourwebsite.com"
          required
          className="input flex-1"
        />
        <button type="submit" disabled={loading} className="btn-primary" style={{ whiteSpace: 'nowrap', fontSize: '16px', padding: '14px 28px' }}>
          {loading ? 'ANALYZING...' : 'ANALYZE'}
        </button>
      </form>
    </div>
  )
}
