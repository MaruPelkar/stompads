import Link from 'next/link'

export default function SuccessPage({
  searchParams
}: {
  searchParams: { campaign_id?: string }
}) {
  const campaignId = searchParams.campaign_id

  return (
    <div className="text-center py-16 space-y-6">
      <h1 className="heading-xl" style={{ color: 'var(--green)' }}>CONFIRMED</h1>
      <p className="label" style={{ fontSize: '13px' }}>Payment received. Hit Go Live to start your ads.</p>
      {campaignId ? (
        <Link href={`/dashboard/${campaignId}`} className="btn-primary">GO LIVE NOW</Link>
      ) : (
        <Link href="/dashboard" className="btn-primary">GO TO DASHBOARD</Link>
      )}
    </div>
  )
}
