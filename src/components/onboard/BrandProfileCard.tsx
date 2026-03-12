import type { BrandProfile, AdCopy } from '@/types/database'

interface Props {
  profile: BrandProfile
  adCopy?: AdCopy | null
}

export function BrandProfileCard({ profile, adCopy }: Props) {
  return (
    <div className="card">
      <h3 className="heading-md">BRAND PROFILE</h3>
      <div className="grid grid-cols-2 gap-4 mt-4" style={{ fontSize: '14px' }}>
        <div>
          <span className="label">Product</span>
          <p style={{ color: 'var(--text)', marginTop: '4px', fontWeight: 600 }}>{profile.product_name}</p>
        </div>
        <div>
          <span className="label">Category</span>
          <p style={{ color: 'var(--text)', marginTop: '4px', fontWeight: 600, textTransform: 'capitalize' }}>{profile.category}</p>
        </div>
        <div className="col-span-2">
          <span className="label">Target Audience</span>
          <p style={{ color: 'var(--text)', marginTop: '4px' }}>{profile.target_audience}</p>
        </div>
        <div className="col-span-2">
          <span className="label">Key Value Props</span>
          <ul className="mt-1 space-y-1">
            {profile.key_value_props.map((prop, i) => (
              <li key={i} style={{ color: 'var(--text)' }}>&bull; {prop}</li>
            ))}
          </ul>
        </div>
      </div>

      {adCopy && (
        <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '16px', marginTop: '16px' }}>
          <h4 className="heading-md" style={{ fontSize: '16px', marginBottom: '12px' }}>AD COPY</h4>
          <div className="space-y-2" style={{ fontSize: '13px' }}>
            <div><span className="label">Headline:</span> <span style={{ color: 'var(--text)', fontWeight: 600, marginLeft: '8px' }}>{adCopy.headline}</span></div>
            <div><span className="label">Primary text:</span> <span style={{ color: 'var(--text)', marginLeft: '8px' }}>{adCopy.primaryText}</span></div>
            <div><span className="label">Description:</span> <span style={{ color: 'var(--text)', marginLeft: '8px' }}>{adCopy.description}</span></div>
          </div>
        </div>
      )}
    </div>
  )
}
