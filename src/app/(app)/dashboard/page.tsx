import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function statusStyle(status: string) {
  if (status === 'live') return { background: 'var(--green-soft)', color: 'var(--green)' }
  if (status === 'ready') return { background: 'var(--orange-soft)', color: 'var(--orange)' }
  return { background: 'var(--input-bg)', color: 'var(--text-muted)' }
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
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '48px', letterSpacing: '1px', color: 'var(--text)' }}>NO CAMPAIGNS YET</h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Create your first campaign and get traffic in minutes.</p>
        <Link
          href="/onboard"
          className="inline-block px-8 py-3 transition"
          style={{ background: 'var(--orange)', color: '#fff', fontFamily: 'var(--font-display)', fontSize: '18px', letterSpacing: '2px', textTransform: 'uppercase', textDecoration: 'none' }}
        >
          CREATE CAMPAIGN
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', letterSpacing: '1px', color: 'var(--text)' }}>YOUR CAMPAIGNS</h1>
        <Link
          href="/onboard"
          className="px-4 py-2 transition"
          style={{ background: 'var(--orange)', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', textDecoration: 'none' }}
        >
          + New campaign
        </Link>
      </div>

      <div className="space-y-3">
        {campaigns.map(campaign => (
          <Link
            key={campaign.id}
            href={`/dashboard/${campaign.id}`}
            className="block transition"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '20px', textDecoration: 'none' }}
          >
            <div className="flex justify-between items-start">
              <div>
                <p style={{ fontWeight: 600, color: 'var(--text)' }}>{campaign.url}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  ${((campaign.daily_budget || 0) / 100).toFixed(0)}/day
                </p>
              </div>
              <span style={{
                fontSize: '10px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '1px',
                padding: '4px 10px', borderRadius: '4px',
                ...statusStyle(campaign.status),
              }}>
                {campaign.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
