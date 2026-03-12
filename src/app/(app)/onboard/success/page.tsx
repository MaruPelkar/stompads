import Link from 'next/link'

export default function SuccessPage({
  searchParams
}: {
  searchParams: { campaign_id?: string }
}) {
  void searchParams
  return (
    <div className="text-center space-y-6 py-16">
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '48px', letterSpacing: '1px', color: 'var(--green)' }}>PAYMENT CONFIRMED</h1>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Your campaign is ready. Head to your dashboard to go live.
      </p>
      <Link
        href="/dashboard"
        className="inline-block px-8 py-3 transition"
        style={{ background: 'var(--orange)', color: '#fff', fontFamily: 'var(--font-display)', fontSize: '18px', letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'none' }}
      >
        GO TO DASHBOARD
      </Link>
    </div>
  )
}
