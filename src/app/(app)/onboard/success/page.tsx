import Link from 'next/link'

export default function SuccessPage({
  searchParams
}: {
  searchParams: { campaign_id?: string }
}) {
  void searchParams
  return (
    <div className="text-center py-16 space-y-6">
      <h1 className="heading-xl" style={{ color: 'var(--green)' }}>PAYMENT CONFIRMED</h1>
      <p className="label" style={{ fontSize: '13px' }}>Your campaign is ready. Head to your dashboard to go live.</p>
      <Link href="/dashboard" className="btn-primary">GO TO DASHBOARD</Link>
    </div>
  )
}
