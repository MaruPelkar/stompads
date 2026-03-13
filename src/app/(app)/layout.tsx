import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogoutButton } from '@/components/LogoutButton'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <nav style={{
        borderBottom: '1px solid var(--card-border)',
        padding: '14px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255,252,248,0.92)',
        backdropFilter: 'blur(16px)',
      }}>
        <Link href="/dashboard" style={{
          fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '2px',
          color: 'var(--text)', textDecoration: 'none',
        }}>
          STOMP<span style={{ color: 'var(--orange)' }}>ADS</span>
        </Link>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Link href="/dashboard" className="nav-link">Dashboard</Link>
          <Link href="/onboard" className="btn-secondary" style={{ fontSize: '11px', padding: '8px 16px' }}>+ New</Link>
          <LogoutButton />
        </div>
      </nav>
      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '36px 24px' }}>
        {children}
      </main>
    </div>
  )
}
