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
        <label className="label">Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
          className="input mt-1" placeholder="you@example.com" />
      </div>
      <div>
        <label className="label">Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
          className="input mt-1" placeholder="••••••••" />
      </div>
      {error && <div className="error-box">{error}</div>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'LOGGING IN...' : 'LOG IN'}
      </button>
      <p className="text-center" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
        No account?{' '}
        <Link href="/signup" style={{ color: 'var(--orange)' }}>Sign up</Link>
      </p>
    </form>
  )
}
