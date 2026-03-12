import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm px-6">
        <div className="mb-10 text-center">
          <Link href="/" style={{ fontFamily: 'var(--font-display)', fontSize: '32px', letterSpacing: '2px', color: 'var(--text)', textDecoration: 'none' }}>
            STOMP<span style={{ color: 'var(--orange)' }}>ADS</span>
          </Link>
          <p className="label" style={{ marginTop: '6px' }}>Run ads. Not headaches.</p>
        </div>
        {children}
      </div>
    </div>
  )
}
