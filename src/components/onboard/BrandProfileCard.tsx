import type { BrandProfile } from '@/types/database'

interface Props {
  profile: BrandProfile
}

export function BrandProfileCard({ profile }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
      <h3 className="font-semibold text-lg">Brand Profile</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Product</span>
          <p className="text-white mt-1">{profile.product_name}</p>
        </div>
        <div>
          <span className="text-gray-500">Category</span>
          <p className="text-white mt-1 capitalize">{profile.category}</p>
        </div>
        <div className="col-span-2">
          <span className="text-gray-500">Target Audience</span>
          <p className="text-white mt-1">{profile.target_audience}</p>
        </div>
        <div className="col-span-2">
          <span className="text-gray-500">Key Value Props</span>
          <ul className="mt-1 space-y-1">
            {profile.key_value_props.map((prop, i) => (
              <li key={i} className="text-white">&bull; {prop}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
