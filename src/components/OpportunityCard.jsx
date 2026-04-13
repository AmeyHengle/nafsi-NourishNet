import { useLang } from '../App'
import CommunityBadge from './CommunityBadge'
import { formatDistance } from '../utils/distance'

export default function OpportunityCard({ entity }) {
  const { t } = useLang()
  const { name, address, hours, description, contact,
          distance, source, status, source_url, confidence_score } = entity

  const isUrgent = confidence_score > 0.8 && source === 'community'

  return (
    <div className="card p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug">{name}</h3>
          {isUrgent && (
            <span className="badge bg-red-50 text-red-700 border border-red-200">
              🔴 {t.volunteers.urgent}
            </span>
          )}
        </div>
        {distance != null && (
          <span className="text-xs text-green-700 font-medium whitespace-nowrap">
            {formatDistance(distance)}
          </span>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1 mb-2">
        <CommunityBadge source={source} status={status} />
      </div>

      {/* Hours */}
      {hours && (
        <p className="text-xs text-green-700 font-medium mb-1">🕐 {hours}</p>
      )}

      {/* Address */}
      {address && (
        <p className="text-xs text-gray-500 mb-2">📍 {address}</p>
      )}

      {/* Description */}
      {description && (
        <p className="text-xs text-gray-600 mb-3 leading-relaxed">{description}</p>
      )}

      {/* Skills */}
      <p className="text-xs text-gray-400 mb-3">
        🛠 {t.volunteers.any_skills}
      </p>

      {/* Contact */}
      {contact && (
        <p className="text-xs text-gray-500 mb-3">📞 {contact}</p>
      )}

      {/* Action */}
      {source_url && (
        <a
          href={source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary text-xs py-1.5 inline-block"
        >
          {t.volunteers.signup}
        </a>
      )}
    </div>
  )
}
