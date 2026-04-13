import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import { formatDistance } from '../utils/distance'

// Default center: Washington DC
const DC_CENTER = [38.9072, -77.0369]
const DEFAULT_ZOOM = 12

// Pin colors by entity type
const PIN_COLORS = {
  event: '#0d9488',       // teal-600
  org: '#2563eb',         // blue-600
  opportunity: '#16a34a', // green-600
}

function createDotIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:14px;height:14px;
      background:${color};
      border-radius:50%;
      border:2px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  })
}

// Recenter map when userLocation changes
function Recenter({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, DEFAULT_ZOOM, { animate: true })
  }, [center, map])
  return null
}

export default function MapView({ entities = [], userLocation, selectedId, onSelect }) {
  const center = userLocation ? [userLocation.lat, userLocation.lng] : DC_CENTER

  return (
    <MapContainer
      center={center}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full rounded-xl"
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Recenter center={userLocation ? [userLocation.lat, userLocation.lng] : null} />

      {/* User location dot */}
      {userLocation && (
        <CircleMarker
          center={[userLocation.lat, userLocation.lng]}
          radius={8}
          pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.9, weight: 2 }}
        >
          <Popup>You are here</Popup>
        </CircleMarker>
      )}

      {/* Entity markers */}
      {entities
        .filter(e => e.lat && e.lng)
        .map(e => (
          <Marker
            key={e.name + e.lat}
            position={[e.lat, e.lng]}
            icon={createDotIcon(PIN_COLORS[e.entity_type] ?? '#6b7280')}
            eventHandlers={{ click: () => onSelect?.(e) }}
          >
            <Popup>
              <div className="min-w-[180px]">
                <p className="font-semibold text-gray-900 text-sm">{e.name}</p>
                {e.address && <p className="text-xs text-gray-500 mt-1">{e.address}</p>}
                {e.hours && <p className="text-xs text-teal-700 mt-1">{e.hours}</p>}
                {e.distance != null && (
                  <p className="text-xs text-gray-400 mt-1">{formatDistance(e.distance)} away</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  )
}
