import { useLang } from '../App'
import CommunityBadge from './CommunityBadge'
import { formatDistance } from '../utils/distance'

export default function OrgCard({ entity }) {
  const { t } = useLang()
  const { name, address, food_types = [], languages_served = [],
          contact, distance, source, status, source_url, description } = entity

  return (
    <div className="card p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug">{name}</h3>
        {distance != null && (
          <span className="text-xs text-blue-700 font-medium whitespace-nowrap">
            {formatDistance(distance)}
          </span>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1 mb-2">
        <CommunityBadge source={source} status={status} />
        {languages_served.includes('es') && (
          <span className="badge bg-blue-50 text-blue-700 border border-blue-200">🗣 ES</span>
        )}
      </div>

      {/* Description */}
      {description && (
        <p className="text-xs text-gray-600 mb-2 leading-relaxed">{description}</p>
      )}

      {/* Address */}
      {address && (
        <p className="text-xs text-gray-500 mb-2">📍 {address}</p>
      )}

      {/* Needs */}
      {food_types.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-500 mb-1">{t.donors.needs}:</p>
          <div className="flex flex-wrap gap-1">
            {food_types.map(f => (
              <span key={f} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full capitalize">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Contact */}
      {contact && (
        <p className="text-xs text-gray-500 mb-3">📞 {contact}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {source_url && (
          <a
            href={source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-xs py-1.5"
          >
            {t.donors.visit}
          </a>
        )}
        {source_url && (
          <a
            href={source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-xs py-1.5"
          >
            {t.donors.donate}
          </a>
        )}
      </div>
    </div>
  )
}
