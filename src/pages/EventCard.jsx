import { useLang } from '../App'
import CommunityBadge from './CommunityBadge'
import { formatDistance } from '../utils/distance'

// ── Telegram icon (inline, small) ───────────────────────────────
function TelegramMini() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="12" fill="#2AABEE" />
      <path
        d="M5.1 11.4l13-5c.6-.2 1.1.1.9.8l-2.2 10.3c-.2.7-.6.9-1.2.5l-3.3-2.4-1.6 1.5c-.2.2-.4.3-.7.3l.2-3.4 5.5-5c.2-.2 0-.3-.3-.1L7.2 13.2l-2.1-.7c-.7-.2-.7-.7 0-.9z"
        fill="white"
      />
    </svg>
  )
}

export default function EventCard({ entity, selected, onClick }) {
  const { t } = useLang()
  const {
    name, address, hours, eligibility, food_types = [],
    languages_served = [], contact, distance, source, status,
    source_url, submitted_via, telegram_group_name, original_message,
  } = entity

  const mapsUrl = address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
    : null

  const isTelegram = source === 'community' &&
    (submitted_via === 'telegram_group' || submitted_via === 'telegram_dm')

  return (
    <div
      onClick={onClick}
      className={`card p-4 cursor-pointer transition-all ${
        selected
          ? 'ring-2 ring-teal-500 shadow-md'
          : 'hover:shadow-md'
      }`}
    >
      {/* ── Header ─────────────────────────────── */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug">{name}</h3>
        {distance != null && (
          <span className="text-xs text-teal-700 font-medium whitespace-nowrap">
            {formatDistance(distance)}
          </span>
        )}
      </div>

      {/* ── Badges ─────────────────────────────── */}
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

      {/* ── Hours ──────────────────────────────── */}
      {hours && (
        <p className="text-xs text-teal-700 font-medium mb-1">🕐 {hours}</p>
      )}

      {/* ── Address ────────────────────────────── */}
      {address && (
        <p className="text-xs text-gray-500 mb-2">📍 {address}</p>
      )}

      {/* ── Food type chips ────────────────────── */}
      {food_types.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {food_types.slice(0, 4).map(f => (
            <span key={f}
              className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
              {f}
            </span>
          ))}
          {food_types.length > 4 && (
            <span className="text-xs text-gray-400">+{food_types.length - 4}</span>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          EXPANDED SECTION (visible when selected)
          ══════════════════════════════════════════ */}
      {selected && (
        <div
          className="mt-2 pt-3 border-t border-gray-100 space-y-3"
          onClick={e => e.stopPropagation()}
        >

          {/* Contact info — prominent */}
          {contact ? (
            <div className="flex items-start gap-2">
              <span className="text-base">📞</span>
              <div>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Contact</p>
                <p className="text-sm text-gray-800 font-semibold">{contact}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">No contact info available</p>
          )}

          {/* Eligibility detail */}
          {eligibility && (
            <div className="flex items-start gap-2">
              <span className="text-base">✅</span>
              <div>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Eligibility</p>
                <p className="text-xs text-gray-700 leading-relaxed">{eligibility}</p>
              </div>
            </div>
          )}

          {/* Original Telegram message */}
          {isTelegram && original_message && (
            <div className="rounded-xl p-3" style={{ background: '#eff9ff' }}>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5"
                 style={{ color: '#2AABEE' }}>
                <TelegramMini />
                {telegram_group_name
                  ? `From ${telegram_group_name}`
                  : 'Original Telegram message'}
              </p>
              <p className="text-xs text-gray-600 leading-relaxed italic">
                "{original_message.length > 220
                    ? original_message.slice(0, 220) + '…'
                    : original_message}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Action buttons ──────────────────────── */}
      <div className="flex gap-2 mt-3">
        {mapsUrl && (
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
