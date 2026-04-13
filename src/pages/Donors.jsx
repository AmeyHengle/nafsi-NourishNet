import { useState } from 'react'
import { useLang, useUserLocation } from '../App'
import { useData, useFilteredData } from '../hooks/useData'
import Navbar from '../components/Navbar'
import SearchBar from '../components/SearchBar'
import FilterPanel from '../components/FilterPanel'
import OrgCard from '../components/OrgCard'
import MapView from '../components/MapView'

const DONATION_TYPES = ['food', 'money', 'both']

export default function Donors() {
  const { t } = useLang()
  const { userLocation, setUserLocation } = useUserLocation()
  const { raw, loading } = useData()
  const [donationType, setDonationType] = useState(null)
  const [filters, setFilters] = useState({ maxDistance: 15 })
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const orgs = useFilteredData({
    raw,
    userLocation,
    type: 'org',
    filters: { ...filters, query, donationType },
  })

  const quizDone = donationType !== null

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left panel ── */}
        <div className="w-full md:w-[420px] flex flex-col border-r border-gray-100 bg-gray-50 overflow-hidden">

          <div className="p-4 bg-white border-b border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="font-semibold text-gray-900">{t.donors.title}</h1>
              {quizDone && (
                <button
                  onClick={() => setShowFilters(v => !v)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    showFilters ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  ⚙ Filters
                </button>
              )}
            </div>

            {/* Donation type quiz */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">{t.donors.quiz_title}</p>
              <div className="flex gap-2">
                {DONATION_TYPES.map(dt => (
                  <button
                    key={dt}
                    onClick={() => setDonationType(dt)}
                    className={`flex-1 text-xs py-2 rounded-lg border transition-colors font-medium ${
                      donationType === dt
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-200 text-gray-600 hover:border-blue-400'
                    }`}
                  >
                    {t.donors[dt]}
                  </button>
                ))}
              </div>
            </div>

            {/* ZIP search */}
            <SearchBar onLocation={setUserLocation} compact />

            {/* Text search */}
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t.search.placeholder}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {showFilters && (
              <FilterPanel filters={filters} onChange={setFilters} type="org" />
            )}

            <p className="text-xs text-gray-500">
              {loading ? '…' : `${orgs.length} ${t.landing.stats.orgs}${userLocation ? ` near ${userLocation.zip ?? userLocation.city}` : ''}`}
            </p>
          </div>

          {/* Org card list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {!quizDone ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <p className="text-3xl mb-3">💚</p>
                <p className="text-gray-500 text-sm">{t.donors.quiz_title}</p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-12 text-gray-400 text-sm">…</div>
            ) : orgs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <p className="text-2xl mb-2">🔍</p>
                <p className="text-gray-500 text-sm">{t.donors.no_results}</p>
              </div>
            ) : (
              orgs.map((e, i) => <OrgCard key={e.name + i} entity={e} />)
            )}
          </div>
        </div>

        {/* ── Map panel ── */}
        <div className="hidden md:block flex-1 p-3">
          <div className="h-full rounded-xl overflow-hidden shadow-sm">
            <MapView entities={orgs} userLocation={userLocation} />
          </div>
        </div>
      </div>
    </div>
  )
}
