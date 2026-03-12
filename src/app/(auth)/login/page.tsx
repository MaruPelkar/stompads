'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-light)' }}>Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full mt-1 px-4 py-3 outline-none transition"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: '14px' }}
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-light)' }}>Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="w-full mt-1 px-4 py-3 outline-none transition"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: '14px' }}
          placeholder="••••••••"
        />
      </div>
      {error && <p style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 transition disabled:opacity-50"
        style={{ background: 'var(--orange)', color: '#fff', fontFamily: 'var(--font-display)', fontSize: '18px', letterSpacing: '2px', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}
      >
        {loading ? 'LOGGING IN...' : 'LOG IN'}
      </button>
      <p className="text-center" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
        No account?{' '}
        <Link href="/signup" style={{ color: 'var(--orange)' }}>Sign up</Link>
      </p>
    </form>
  )
}
