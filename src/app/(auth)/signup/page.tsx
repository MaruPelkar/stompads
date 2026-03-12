'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}

function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const redirect = searchParams.get('redirect')
    router.push(redirect || '/onboard')
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
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
          className="input mt-1" placeholder="6+ characters" />
      </div>
      {error && <div className="error-box">{error}</div>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
      </button>
      <p className="text-center" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: 'var(--orange)' }}>Log in</Link>
      </p>
    </form>
  )
}
