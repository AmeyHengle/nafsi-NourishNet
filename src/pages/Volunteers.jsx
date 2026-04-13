import { useState } from 'react'
import { useLang, useUserLocation } from '../App'
import { useData, useFilteredData } from '../hooks/useData'
import Navbar from '../components/Navbar'
import SearchBar from '../components/SearchBar'
import FilterPanel from '../components/FilterPanel'
import MapView from '../components/MapView'
import OpportunityCard from '../components/OpportunityCard'

export default function Volunteers() {
  const { t } = useLang()
  const { userLocation, setUserLocation } = useUserLocation()
  const { raw, loading } = useData()
  const [filters, setFilters] = useState({ maxDistance: 15 })
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const opportunities = useFilteredData({
    raw,
    userLocation,
    type: 'opportunity',
    filters: { ...filters, query },
  })

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left panel ── */}
        <div className="w-full md:w-[420px] flex flex-col border-r border-gray-100 bg-gray-50 overflow-hidden">

          <div className="p-4 bg-white border-b border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="font-semibold text-gray-900">{t.volunteers.title}</h1>
              <button
                onClick={() => setShowFilters(v => !v)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  showFilters ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-600'
                }`}
              >
                ⚙ Filters
              </button>
            </div>

            <SearchBar onLocation={setUserLocation} compact />

            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t.search.placeholder}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />

            {showFilters && (
              <FilterPanel filters={filters} onChange={setFilters} type="opportunity" />
            )}

            <p className="text-xs text-gray-500">
              {loading
                ? '…'
                : `${opportunities.length} ${t.landing.stats.opportunities}${userLocation ? ` near ${userLocation.zip ?? userLocation.city}` : ''}`}
            </p>
          </div>

          {/* Opportunity list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-gray-400 text-sm">…</div>
            ) : opportunities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <p className="text-2xl mb-2">🙋</p>
                <p className="text-gray-500 text-sm">{t.volunteers.no_results}</p>
              </div>
            ) : (
              opportunities.map((e, i) => (
                <OpportunityCard key={e.name + i} entity={e} />
              ))
            )}
          </div>
        </div>

        {/* ── Map panel ── */}
        <div className="hidden md:block flex-1 p-3">
          <div className="h-full rounded-xl overflow-hidden shadow-sm">
            <MapView entities={opportunities} userLocation={userLocation} />
          </div>
        </div>
      </div>
    </div>
  )
}
