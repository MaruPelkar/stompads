interface Props {
  label: string
  value: string | number
  sub?: string
}

export function MetricsBadge({ label, value, sub }: Props) {
  return (
    <div className="card" style={{ padding: '16px' }}>
      <p className="label">{label}</p>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '26px', color: 'var(--text)', marginTop: '4px', letterSpacing: '1px' }}>{value}</p>
      {sub && <p className="label" style={{ marginTop: '2px' }}>{sub}</p>}
    </div>
  )
}
