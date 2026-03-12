import Link from 'next/link'

export default function SuccessPage({
  searchParams
}: {
  searchParams: { campaign_id?: string }
}) {
  void searchParams
  return (
    <div className="text-center py-16 space-y-6">
      <h1 className="heading-xl" style={{ color: 'var(--green)' }}>CONFIRMED</h1>
      <p className="label" style={{ fontSize: '13px' }}>Payment received. Your campaign is ready.</p>
      <Link href="/dashboard" className="btn-primary">GO TO DASHBOARD</Link>
    </div>
  )
}
