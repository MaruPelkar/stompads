import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function badgeClass(status: string) {
  if (status === 'live') return 'badge badge-live'
  if (status === 'ready') return 'badge badge-ready'
  return 'badge badge-default'
}

function statusLabel(status: string) {
  if (status === 'live') return 'live'
  if (status === 'ready') return 'ready'
  if (status === 'generating' || status === 'generating_full') return 'processing'
  if (status === 'payment_pending') return 'awaiting payment'
  if (status === 'preview_ready') return 'ready'
  return status
}

function resumeHref(campaign: { id: string; status: string; url: string }) {
  // Campaigns that can be resumed from the dashboard
  if (campaign.status === 'generating') return `/dashboard/${campaign.id}` // show progress
  if (campaign.status === 'payment_pending' || campaign.status === 'ready' || campaign.status === 'preview_ready') return `/dashboard/${campaign.id}`
  if (campaign.status === 'draft') return `/onboard?url=${encodeURIComponent(campaign.url)}` // restart
  return `/dashboard/${campaign.id}`
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
        <p className="label" style={{ fontSize: '13px' }}>Drop a URL. Get ads. Get traffic.</p>
        <Link href="/onboard" className="btn-primary">START NOW</Link>
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
            href={resumeHref(campaign)}
            className="card card-hover block"
            style={{ textDecoration: 'none' }}
          >
            <div className="flex justify-between items-center">
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, color: 'var(--text)', fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{campaign.url}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {campaign.daily_budget ? `$${(campaign.daily_budget / 100).toFixed(0)}/day` : 'No budget set'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <span className={badgeClass(campaign.status)}>{statusLabel(campaign.status)}</span>
                {(campaign.status === 'draft' || campaign.status === 'payment_pending' || campaign.status === 'ready') && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--orange)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    Resume →
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
