import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import { formatDistance } from '../utils/distance'

const DC_CENTER  = [38.9072, -77.0369]
const DEFAULT_ZOOM = 12

// Clean, minimal dot colors by entity type
const PIN_COLORS = {
  event:       '#0d9488',  // teal
  org:         '#2563eb',  // blue
  opportunity: '#16a34a',  // green
}

function createDotIcon(color, selected = false) {
  const size = selected ? 18 : 13
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px; height:${size}px;
      background:${color};
      border-radius:50%;
      border:${selected ? '3px' : '2px'} solid white;
      box-shadow:0 1px 4px rgba(0,0,0,0.25);
      transition: all .15s;
    "></div>`,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2) - 4],
  })
}

function Recenter({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, DEFAULT_ZOOM, { animate: true })
  }, [center, map])
  return null
}

// ── Popup content ──────────────────────────────────────────────

function EntityPopup({ entity }) {
  const {
    name, address, hours, eligibility, contact, description,
    source, submitted_via, telegram_group_name, original_message,
    source_url, distance, food_types = [], entity_type,
  } = entity

  const mapsUrl = address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
    : null

  const isTelegram = source === 'community' &&
    (submitted_via === 'telegram_group' || submitted_via === 'telegram_dm')

  return (
    <div style={{ minWidth: 220, maxWidth: 280, fontFamily: 'system-ui, sans-serif' }}>

      {/* Name + type badge */}
      <div style={{ marginBottom: 8 }}>
        <p style={{ fontWeight: 700, fontSize: 14, color: '#111', margin: 0, lineHeight: 1.3 }}>
          {name}
        </p>
        <span style={{
          display: 'inline-block', marginTop: 4, fontSize: 10, fontWeight: 600,
          padding: '1px 7px', borderRadius: 4,
          background: entity_type === 'event' ? '#ccfbf1' :
                      entity_type === 'org'   ? '#dbeafe' : '#dcfce7',
          color:      entity_type === 'event' ? '#0f766e' :
                      entity_type === 'org'   ? '#1d4ed8' : '#15803d',
        }}>
          {entity_type}
        </span>
        {distance != null && (
          <span style={{ marginLeft: 6, fontSize: 11, color: '#9ca3af' }}>
            · {formatDistance(distance)}
          </span>
        )}
      </div>

      {/* Divider */}
      <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0', margin: '8px 0' }} />

      {/* Key details */}
      {address && (
        <p style={{ fontSize: 12, color: '#555', margin: '4px 0', display: 'flex', gap: 6 }}>
          <span>📍</span><span>{address}</span>
        </p>
      )}
      {hours && (
        <p style={{ fontSize: 12, color: '#0f766e', fontWeight: 500, margin: '4px 0',
                    display: 'flex', gap: 6 }}>
          <span>🕐</span><span>{hours}</span>
        </p>
      )}
      {eligibility && (
        <p style={{ fontSize: 12, color: '#555', margin: '4px 0', display: 'flex', gap: 6 }}>
          <span>✅</span><span>{eligibility}</span>
        </p>
      )}

      {/* Food types chips */}
      {food_types.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '6px 0' }}>
          {food_types.slice(0, 4).map(f => (
            <span key={f} style={{
              fontSize: 10, background: '#f3f4f6', color: '#374151',
              padding: '1px 6px', borderRadius: 4, textTransform: 'capitalize'
            }}>{f}</span>
          ))}
        </div>
      )}

      {/* Contact — prominent */}
      {contact && (
        <>
          <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0', margin: '8px 0' }} />
          <p style={{ fontSize: 12, color: '#111', fontWeight: 600, margin: '4px 0',
                      display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <span>📞</span>
            <span style={{ fontWeight: 400, color: '#374151', wordBreak: 'break-word' }}>
              {contact}
            </span>
          </p>
        </>
      )}

      {/* Original Telegram message */}
      {isTelegram && original_message && (
        <>
          <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0', margin: '8px 0' }} />
          <div style={{ background: '#eff9ff', borderRadius: 8, padding: '8px 10px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#2AABEE', margin: '0 0 4px',
                        display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="12" fill="#2AABEE"/>
                <path d="M5.1 11.4l13-5c.6-.2 1.1.1.9.8l-2.2 10.3c-.2.7-.6.9-1.2.5l-3.3-2.4-1.6 1.5c-.2.2-.4.3-.7.3l.2-3.4 5.5-5c.2-.2 0-.3-.3-.1L7.2 13.2l-2.1-.7c-.7-.2-.7-.7 0-.9z" fill="white"/>
              </svg>
              {telegram_group_name
                ? `Original message from ${telegram_group_name}`
                : 'Original Telegram message'}
            </p>
            <p style={{ fontSize: 11, color: '#374151', margin: 0, lineHeight: 1.5,
                        fontStyle: 'italic', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              "{original_message.length > 180
                  ? original_message.slice(0, 180) + '…'
                  : original_message}"
            </p>
          </div>
        </>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, background: '#0d9488', color: '#fff', fontSize: 11,
                     fontWeight: 600, padding: '6px 0', borderRadius: 8,
                     textAlign: 'center', textDecoration: 'none' }}>
            Directions
          </a>
        )}
        {source_url && (
          <a href={source_url} target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, border: '1px solid #e5e7eb', color: '#374151', fontSize: 11,
                     fontWeight: 600, padding: '6px 0', borderRadius: 8,
                     textAlign: 'center', textDecoration: 'none' }}>
            Details
          </a>
        )}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────

export default function MapView({ entities = [], userLocation, selectedId, onSelect }) {
  const center = userLocation ? [userLocation.lat, userLocation.lng] : DC_CENTER

  return (
    <MapContainer
      center={center}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full rounded-xl"
      zoomControl={true}
    >
      {/* CartoDB Positron — clean, minimal, great for data overlays */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />

      <Recenter center={userLocation ? [userLocation.lat, userLocation.lng] : null} />

      {/* User location pulse dot */}
      {userLocation && (
        <CircleMarker
          center={[userLocation.lat, userLocation.lng]}
          radius={7}
          pathOptions={{
            color: '#1d4ed8', fillColor: '#3b82f6',
            fillOpacity: 0.85, weight: 2,
          }}
        >
          <Popup>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>You are here</p>
          </Popup>
        </CircleMarker>
      )}

      {/* Entity markers */}
      {entities
        .filter(e => e.lat && e.lng)
        .map((e, i) => {
          const isSelected = selectedId === e.name
          const color = PIN_COLORS[e.entity_type] ?? '#6b7280'
          return (
            <Marker
              key={e.name + i}
              position={[e.lat, e.lng]}
              icon={createDotIcon(color, isSelected)}
              eventHandlers={{ click: () => onSelect?.(e) }}
              zIndexOffset={isSelected ? 1000 : 0}
            >
              <Popup maxWidth={300} autoPan={true}>
                <EntityPopup entity={e} />
              </Popup>
            </Marker>
          )
        })}
    </MapContainer>
  )
}
