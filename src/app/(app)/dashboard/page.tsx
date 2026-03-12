import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select()
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="text-center py-20 space-y-6">
        <h1 className="text-3xl font-bold">No campaigns yet</h1>
        <p className="text-gray-400">Create your first campaign and get traffic in minutes.</p>
        <Link
          href="/onboard"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition"
        >
          Create campaign
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Your Campaigns</h1>
        <Link
          href="/onboard"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
        >
          + New campaign
        </Link>
      </div>

      <div className="space-y-3">
        {campaigns.map(campaign => (
          <Link
            key={campaign.id}
            href={`/dashboard/${campaign.id}`}
            className="block bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-5 transition"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{campaign.url}</p>
                <p className="text-sm text-gray-400 mt-1">
                  ${((campaign.daily_budget || 0) / 100).toFixed(0)}/day
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                campaign.status === 'live' ? 'bg-green-900 text-green-300' :
                campaign.status === 'ready' ? 'bg-blue-900 text-blue-300' :
                'bg-gray-800 text-gray-400'
              }`}>
                {campaign.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
