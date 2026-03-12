export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md px-8">
        <div className="mb-8 text-center">
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '36px', letterSpacing: '2px', color: 'var(--text)' }}>
            STOMP<span style={{ color: 'var(--orange)' }}>ADS</span>
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '4px' }}>Run ads. Not headaches.</p>
        </div>
        {children}
      </div>
    </div>
  )
}
