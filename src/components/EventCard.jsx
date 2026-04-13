import { useLang } from '../App'
import CommunityBadge from './CommunityBadge'
import { formatDistance } from '../utils/distance'

export default function EventCard({ entity, selected, onClick }) {
  const { t } = useLang()
  const { name, address, hours, eligibility, food_types = [],
          languages_served = [], contact, distance, source, status, source_url } = entity

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address ?? name)}`

  return (
    <div
      onClick={onClick}
      className={`card p-4 cursor-pointer transition-all ${
        selected ? 'ring-2 ring-teal-500 shadow-md' : 'hover:shadow-md'
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug">{name}</h3>
        {distance != null && (
          <span className="text-xs text-teal-700 font-medium whitespace-nowrap">
            {formatDistance(distance)}
          </span>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1 mb-2">
        <CommunityBadge source={source} status={status} />
        {eligibility?.toLowerCase().includes('no id') && (
          <span className="badge bg-green-50 text-green-700 border border-green-200">
            ✓ {t.families.no_id}
          </span>
        )}
        {languages_served.includes('es') && (
          <span className="badge bg-blue-50 text-blue-700 border border-blue-200">
            🗣 ES
          </span>
        )}
      </div>

      {/* Hours */}
      {hours && (
        <p className="text-xs text-teal-700 font-medium mb-1">🕐 {hours}</p>
      )}

      {/* Address */}
      {address && (
        <p className="text-xs text-gray-500 mb-2">📍 {address}</p>
      )}

      {/* Food types */}
      {food_types.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {food_types.slice(0, 4).map(f => (
            <span key={f} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
              {f}
            </span>
          ))}
          {food_types.length > 4 && (
            <span className="text-xs text-gray-400">+{food_types.length - 4}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {address && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="btn-primary text-xs py-1.5"
          >
            {t.families.directions}
          </a>
        )}
        {source_url && (
          <a
            href={source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="btn-secondary text-xs py-1.5"
          >
            {t.families.details}
          </a>
        )}
      </div>
    </div>
  )
}
