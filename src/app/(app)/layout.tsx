import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <nav style={{
        borderBottom: '1px solid var(--card-border)',
        padding: '16px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255,252,248,0.9)',
        backdropFilter: 'blur(12px)',
      }}>
        <Link href="/dashboard" style={{
          fontFamily: 'var(--font-display)', fontSize: '24px', letterSpacing: '2px',
          color: 'var(--text)', textDecoration: 'none',
        }}>
          STOMP<span style={{ color: 'var(--orange)' }}>ADS</span>
        </Link>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <Link href="/dashboard" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-light)', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Dashboard
          </Link>
          <Link href="/onboard" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-light)', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '1px' }}>
            New Campaign
          </Link>
        </div>
      </nav>
      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 24px' }}>
        {children}
      </main>
    </div>
  )
}
