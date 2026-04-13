import { useState } from 'react'
import { useLang, useUserLocation } from '../App'
import { useData, useFilteredData } from '../hooks/useData'
import Navbar from '../components/Navbar'
import SearchBar from '../components/SearchBar'
import FilterPanel from '../components/FilterPanel'
import MapView from '../components/MapView'
import EventCard from '../components/EventCard'

export default function Families() {
  const { t } = useLang()
  const { userLocation, setUserLocation } = useUserLocation()
  const { raw, loading } = useData()
  const [filters, setFilters] = useState({ maxDistance: 10 })
  const [query, setQuery] = useState('')
  const [selectedEntity, setSelectedEntity] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  const events = useFilteredData({
    raw,
    userLocation,
    type: 'event',
    filters: { ...filters, query },
  })

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left panel ── */}
        <div className="w-full md:w-[420px] flex flex-col border-r border-gray-100 bg-gray-50 overflow-hidden">

          {/* Panel header */}
          <div className="p-4 bg-white border-b border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="font-semibold text-gray-900">{t.families.title}</h1>
              <button
                onClick={() => setShowFilters(v => !v)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  showFilters
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'border-gray-200 text-gray-600 hover:border-teal-400'
                }`}
              >
                ⚙ {t.filters.distance}
              </button>
            </div>

            {/* ZIP search */}
            <SearchBar onLocation={setUserLocation} compact />

            {/* Text search */}
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t.search.placeholder}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />

            {/* Filter panel (collapsible) */}
            {showFilters && (
              <FilterPanel filters={filters} onChange={setFilters} type="event" />
            )}

            {/* Result count */}
            <p className="text-xs text-gray-500">
              {loading ? t.families.loading : `${events.length} ${t.landing.stats.events}${userLocation ? ` near ${userLocation.zip ?? userLocation.city}` : ''}`}
            </p>
          </div>

          {/* Card list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 card-list">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
                {t.families.loading}
              </div>
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <p className="text-2xl mb-2">🔍</p>
                <p className="text-gray-500 text-sm">{t.families.no_results}</p>
              </div>
            ) : (
              events.map((e, i) => (
                <EventCard
                  key={e.name + i}
                  entity={e}
                  selected={selectedEntity?.name === e.name}
                  onClick={() => setSelectedEntity(e)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Map panel ── */}
        <div className="hidden md:block flex-1 p-3">
          <div className="h-full rounded-xl overflow-hidden shadow-sm">
            <MapView
              entities={events}
              userLocation={userLocation}
              selectedId={selectedEntity?.name}
              onSelect={setSelectedEntity}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
