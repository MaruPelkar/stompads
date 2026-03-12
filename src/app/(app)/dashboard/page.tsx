import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function badgeClass(status: string) {
  if (status === 'live') return 'badge badge-live'
  if (status === 'ready') return 'badge badge-ready'
  return 'badge badge-default'
}

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
        <h1 className="heading-xl">NO CAMPAIGNS YET</h1>
        <p className="label" style={{ fontSize: '13px' }}>Create your first campaign and get traffic in minutes.</p>
        <Link href="/onboard" className="btn-primary">CREATE CAMPAIGN</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="heading-lg">YOUR CAMPAIGNS</h1>
        <Link href="/onboard" className="btn-secondary">+ New campaign</Link>
      </div>

      <div className="space-y-3">
        {campaigns.map(campaign => (
          <Link
            key={campaign.id}
            href={`/dashboard/${campaign.id}`}
            className="card card-hover block"
            style={{ textDecoration: 'none' }}
          >
            <div className="flex justify-between items-start">
              <div>
                <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: '15px' }}>{campaign.url}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  ${((campaign.daily_budget || 0) / 100).toFixed(0)}/day
                </p>
              </div>
              <span className={badgeClass(campaign.status)}>{campaign.status}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
