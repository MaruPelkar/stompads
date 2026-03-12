import Link from 'next/link'

export default function SuccessPage({
  searchParams
}: {
  searchParams: { campaign_id?: string }
}) {
  void searchParams
  return (
    <div className="text-center space-y-6 py-12">
      <div className="text-6xl">&#127881;</div>
      <h1 className="text-3xl font-bold">Payment confirmed!</h1>
      <p className="text-gray-400 text-lg">
        We&apos;re generating your full campaign now. Check your dashboard in a few minutes.
      </p>
      <Link
        href="/dashboard"
        className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition"
      >
        Go to Dashboard &rarr;
      </Link>
    </div>
  )
}
