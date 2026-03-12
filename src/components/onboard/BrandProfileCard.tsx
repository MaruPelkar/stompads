import type { BrandProfile, AdCopy } from '@/types/database'

interface Props {
  profile: BrandProfile
  adCopy?: AdCopy | null
}

export function BrandProfileCard({ profile, adCopy }: Props) {
  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '24px' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', letterSpacing: '1px', color: 'var(--text)' }}>BRAND PROFILE</h3>
      <div className="grid grid-cols-2 gap-4 mt-4" style={{ fontSize: '14px' }}>
        <div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-muted)' }}>Product</span>
          <p style={{ color: 'var(--text)', marginTop: '4px', fontWeight: 600 }}>{profile.product_name}</p>
        </div>
        <div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-muted)' }}>Category</span>
          <p style={{ color: 'var(--text)', marginTop: '4px', fontWeight: 600, textTransform: 'capitalize' }}>{profile.category}</p>
        </div>
        <div className="col-span-2">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-muted)' }}>Target Audience</span>
          <p style={{ color: 'var(--text)', marginTop: '4px' }}>{profile.target_audience}</p>
        </div>
        <div className="col-span-2">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-muted)' }}>Key Value Props</span>
          <ul className="mt-1 space-y-1">
            {profile.key_value_props.map((prop, i) => (
              <li key={i} style={{ color: 'var(--text)' }}>&bull; {prop}</li>
            ))}
          </ul>
        </div>
      </div>

      {adCopy && (
        <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '16px', marginTop: '16px' }}>
          <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', letterSpacing: '1px', color: 'var(--text)', marginBottom: '12px' }}>AD COPY</h4>
          <div className="space-y-2" style={{ fontSize: '13px' }}>
            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>Headline:</span>
              <span style={{ color: 'var(--text)', marginLeft: '8px', fontWeight: 600 }}>{adCopy.headline}</span>
            </div>
            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>Primary text:</span>
              <span style={{ color: 'var(--text)', marginLeft: '8px' }}>{adCopy.primaryText}</span>
            </div>
            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>Description:</span>
              <span style={{ color: 'var(--text)', marginLeft: '8px' }}>{adCopy.description}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
