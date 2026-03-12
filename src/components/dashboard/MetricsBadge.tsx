interface Props {
  label: string
  value: string | number
  sub?: string
}

export function MetricsBadge({ label, value, sub }: Props) {
  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '6px', padding: '16px' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-muted)' }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--text)', marginTop: '4px', letterSpacing: '1px' }}>{value}</p>
      {sub && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</p>}
    </div>
  )
}
