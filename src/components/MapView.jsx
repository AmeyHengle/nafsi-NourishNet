import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import { formatDistance } from '../utils/distance'

const DC_CENTER   = [38.9072, -77.0369]
const DEFAULT_ZOOM = 11

// ── Color scheme ────────────────────────────────────────────────
//
// INNER DOT COLOR — encodes entity type (what it is)
const ENTITY_FILL = {
  event:       '#0d9488',  // teal
  org:         '#2563eb',  // blue
  opportunity: '#16a34a',  // green
}

// BORDER COLOR — encodes data source (where it came from)
const SOURCE_BORDER = {
  web:       '#ffffff',   // white  — standard web-scraped data
  community: '#2AABEE',   // Telegram blue — submitted by community
  mock:      '#f59e0b',   // amber  — demo/seed data
}

// Label shown in the legend
const SOURCE_LABELS = {
  web:       'Web scraped',
  community: 'Community (Telegram)',
  mock:      'Demo data',
}

const ENTITY_LABELS = {
  event:       'Food event',
  org:         'Donor org',
  opportunity: 'Volunteer opportunity',
}

// ── Pin factory ──────────────────────────────────────────────────
function createPin(entity, selected = false) {
  const fill   = ENTITY_FILL[entity.entity_type]  ?? '#6b7280'
  const border = SOURCE_BORDER[entity.source]      ?? '#ffffff'
  const size   = selected ? 20 : 14
  const bw     = selected ? 4  : 2.5

  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px; height:${size}px;
      background:${fill};
      border-radius:50%;
      border:${bw}px solid ${border};
      box-shadow:0 1px 5px rgba(0,0,0,0.3);
      outline:${selected ? `2px solid ${fill}` : 'none'};
      outline-offset:2px;
      transition:all .15s;
    "></div>`,
    iconSize:    [size, size],
    iconAnchor:  [size / 2, size / 2],
    popupAnchor: [0, -(size / 2) - 4],
  })
}

// ── Recenter helper ──────────────────────────────────────────────
function Recenter({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, DEFAULT_ZOOM, { animate: true })
  }, [center, map])
  return null
}

// ── Map legend (positioned div overlay) ─────────────────────────
function MapLegend() {
  return (
    <div style={{
      position: 'absolute', bottom: 28, right: 10, zIndex: 1000,
      background: 'rgba(255,255,255,0.95)', borderRadius: 10,
      padding: '10px 13px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      fontSize: 11, lineHeight: 1.6, minWidth: 160,
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Entity type section */}
      <p style={{ fontWeight: 700, color: '#374151', marginBottom: 4, fontSize: 10,
                  textTransform: 'uppercase', letterSpacing: '.06em' }}>Type</p>
      {Object.entries(ENTITY_LABELS).map(([type, label]) => (
        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
          <div style={{
            width: 12, height: 12, borderRadius: '50%',
            background: ENTITY_FILL[type], border: '2px solid white',
            boxShadow: '0 1px 3px rgba(0,0,0,.2)', flexShrink: 0,
          }}/>
          <span style={{ color: '#374151' }}>{label}</span>
        </div>
      ))}

      {/* Divider */}
      <div style={{ borderTop: '1px solid #e5e7eb', margin: '8px 0' }}/>

      {/* Source section */}
      <p style={{ fontWeight: 700, color: '#374151', marginBottom: 4, fontSize: 10,
                  textTransform: 'uppercase', letterSpacing: '.06em' }}>Source (border)</p>
      {Object.entries(SOURCE_LABELS).map(([src, label]) => (
        <div key={src} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
          <div style={{
            width: 12, height: 12, borderRadius: '50%',
            background: '#6b7280',
            border: `2.5px solid ${SOURCE_BORDER[src]}`,
            boxShadow: '0 1px 3px rgba(0,0,0,.2)', flexShrink: 0,
          }}/>
          <span style={{ color: '#374151' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Popup content ────────────────────────────────────────────────
function EntityPopup({ entity }) {
  const {
    name, address, hours, eligibility, contact, entity_type,
    source, submitted_via, telegram_group_name, original_message,
    source_url, distance, food_types = [], current_needs = [],
    skills_needed = [], spots_available, commitment,
  } = entity

  const mapsUrl = address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
    : null

  const isTelegram = source === 'community' &&
    (submitted_via === 'telegram_group' || submitted_via === 'telegram_dm')

  // Source pill config
  const sourcePill = {
    web:       { bg: '#f0fdf4', color: '#166534', label: '🌐 Web'       },
    community: { bg: '#eff9ff', color: '#0369a1', label: '✈ Telegram'  },
    mock:      { bg: '#fffbeb', color: '#92400e', label: '🧪 Demo data' },
  }[source] ?? { bg: '#f3f4f6', color: '#374151', label: source }

  return (
    <div style={{ minWidth: 220, maxWidth: 290, fontFamily: 'system-ui, sans-serif', fontSize: 12 }}>

      {/* Name + badges */}
      <p style={{ fontWeight: 700, fontSize: 13.5, color: '#111', margin: '0 0 6px', lineHeight: 1.3 }}>
        {name}
      </p>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 4,
                       background: ENTITY_FILL[entity_type] + '20',
                       color: ENTITY_FILL[entity_type] }}>
          {ENTITY_LABELS[entity_type]}
        </span>
        <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 4,
                       background: sourcePill.bg, color: sourcePill.color }}>
          {sourcePill.label}
        </span>
        {distance != null && (
          <span style={{ fontSize: 10, color: '#9ca3af' }}>{formatDistance(distance)}</span>
        )}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0', margin: '6px 0' }}/>

      {/* Core details */}
      {address && (
        <p style={{ color: '#555', margin: '3px 0', display: 'flex', gap: 5 }}>
          <span>📍</span><span>{address}</span>
        </p>
      )}
      {hours && (
        <p style={{ color: '#0f766e', fontWeight: 500, margin: '3px 0', display: 'flex', gap: 5 }}>
          <span>🕐</span><span>{hours}</span>
        </p>
      )}
      {eligibility && (
        <p style={{ color: '#555', margin: '3px 0', display: 'flex', gap: 5 }}>
          <span>✅</span><span>{eligibility}</span>
        </p>
      )}

      {/* Food types (events + orgs) */}
      {food_types.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, margin: '5px 0' }}>
          {food_types.slice(0, 4).map(f => (
            <span key={f} style={{ fontSize: 10, background: '#f3f4f6', color: '#374151',
                                   padding: '1px 5px', borderRadius: 4, textTransform: 'capitalize' }}>
              {f}
            </span>
          ))}
        </div>
      )}

      {/* Current needs (orgs) */}
      {current_needs.length > 0 && (
        <div style={{ margin: '4px 0' }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#555' }}>Currently needs: </span>
          <span style={{ fontSize: 10, color: '#374151' }}>
            {current_needs.slice(0, 3).join(', ')}
          </span>
        </div>
      )}

      {/* Skills + spots (opportunities) */}
      {skills_needed.length > 0 && skills_needed[0] !== 'none required' && (
        <p style={{ color: '#555', fontSize: 11, margin: '3px 0' }}>
          🛠 {skills_needed.join(', ')}
        </p>
      )}
      {spots_available != null && (
        <p style={{ color: spots_available <= 5 ? '#dc2626' : '#16a34a',
                    fontWeight: 600, fontSize: 11, margin: '3px 0' }}>
          {spots_available <= 5 ? '🔴' : '🟢'} {spots_available} spot{spots_available !== 1 ? 's' : ''} available
        </p>
      )}

      {/* Contact — prominent */}
      {contact && (
        <>
          <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0', margin: '6px 0' }}/>
          <p style={{ color: '#111', fontWeight: 600, margin: '3px 0', display: 'flex', gap: 5 }}>
            <span>📞</span>
            <span style={{ fontWeight: 400, color: '#374151', wordBreak: 'break-word' }}>{contact}</span>
          </p>
        </>
      )}

      {/* Original Telegram message */}
      {isTelegram && original_message && (
        <>
          <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0', margin: '6px 0' }}/>
          <div style={{ background: '#eff9ff', borderRadius: 8, padding: '7px 9px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#2AABEE', margin: '0 0 3px' }}>
              ✈ {telegram_group_name ?? 'Telegram message'}
            </p>
            <p style={{ fontSize: 10, color: '#374151', margin: 0, fontStyle: 'italic',
                        lineHeight: 1.4, wordBreak: 'break-word' }}>
              "{original_message.length > 160
                  ? original_message.slice(0, 160) + '…'
                  : original_message}"
            </p>
          </div>
        </>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 5, marginTop: 9 }}>
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, background: ENTITY_FILL[entity_type], color: '#fff',
                     fontSize: 11, fontWeight: 600, padding: '5px 0', borderRadius: 7,
                     textAlign: 'center', textDecoration: 'none' }}>
            Directions
          </a>
        )}
        {source_url && (
          <a href={source_url} target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, border: '1px solid #e5e7eb', color: '#374151',
                     fontSize: 11, fontWeight: 600, padding: '5px 0', borderRadius: 7,
                     textAlign: 'center', textDecoration: 'none' }}>
            Details →
          </a>
        )}
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────
export default function MapView({ entities = [], userLocation, selectedId, onSelect }) {
  const center = userLocation ? [userLocation.lat, userLocation.lng] : DC_CENTER

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%', borderRadius: 12 }}
        zoomControl={true}
      >
        {/* CartoDB Positron — clean, minimal, data-first */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />

        <Recenter center={userLocation ? [userLocation.lat, userLocation.lng] : null} />

        {/* User location */}
        {userLocation && (
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={7}
            pathOptions={{
              color: '#1d4ed8', fillColor: '#3b82f6',
              fillOpacity: 0.9, weight: 2,
            }}
          >
            <Popup>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>📍 You are here</p>
            </Popup>
          </CircleMarker>
        )}

        {/* Entity markers */}
        {entities
          .filter(e => e.lat && e.lng)
          .map((e, i) => {
            const isSelected = selectedId === e.name
            return (
              <Marker
                key={e.name + i}
                position={[e.lat, e.lng]}
                icon={createPin(e, isSelected)}
                eventHandlers={{ click: () => onSelect?.(e) }}
                zIndexOffset={isSelected ? 1000 : 0}
              >
                <Popup maxWidth={300} autoPan>
                  <EntityPopup entity={e} />
                </Popup>
              </Marker>
            )
          })}
      </MapContainer>

      {/* Legend overlay — sits above the map */}
      <MapLegend />
    </div>
  )
}
