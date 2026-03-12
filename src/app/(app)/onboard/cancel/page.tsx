import Link from 'next/link'

export default function CancelPage({
  searchParams
}: {
  searchParams: { campaign_id?: string }
}) {
  return (
    <div className="text-center py-16 space-y-6">
      <h1 className="heading-xl">CANCELLED</h1>
      <p className="label" style={{ fontSize: '13px' }}>No charge. Your ads are still here when you&apos;re ready.</p>
      <Link
        href={searchParams.campaign_id ? `/onboard?campaign_id=${searchParams.campaign_id}` : '/onboard'}
        className="btn-ghost"
      >
        GO BACK
      </Link>
    </div>
  )
}
