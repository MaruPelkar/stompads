import Link from 'next/link'

export default function CancelPage({
  searchParams
}: {
  searchParams: { campaign_id?: string }
}) {
  return (
    <div className="text-center space-y-6 py-16">
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '48px', letterSpacing: '1px', color: 'var(--text)' }}>PAYMENT CANCELLED</h1>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
        No charge was made. You can try again whenever you&apos;re ready.
      </p>
      <Link
        href={searchParams.campaign_id ? `/onboard?campaign_id=${searchParams.campaign_id}` : '/onboard'}
        className="inline-block px-8 py-3 transition"
        style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text)', fontFamily: 'var(--font-display)', fontSize: '18px', letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'none' }}
      >
        GO BACK
      </Link>
    </div>
  )
}
