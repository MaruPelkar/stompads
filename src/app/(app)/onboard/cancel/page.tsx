import Link from 'next/link'

export default function CancelPage({
  searchParams
}: {
  searchParams: { campaign_id?: string }
}) {
  return (
    <div className="text-center space-y-6 py-12">
      <h1 className="text-3xl font-bold">Payment cancelled</h1>
      <p className="text-gray-400">No charge was made. You can try again whenever you&apos;re ready.</p>
      <Link
        href={searchParams.campaign_id ? `/onboard?campaign_id=${searchParams.campaign_id}` : '/onboard'}
        className="inline-block bg-gray-700 hover:bg-gray-600 text-white font-semibold px-8 py-3 rounded-lg transition"
      >
        &larr; Go back
      </Link>
    </div>
  )
}
