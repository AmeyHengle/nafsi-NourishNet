import { useLang } from '../App'

const DISTANCES = [2, 5, 10, 25]
const FOOD_TYPES = ['all', 'produce', 'canned goods', 'hot meals', 'bread', 'baby food']
const SCHEDULES = ['any_day', 'today', 'weekend', 'weekdays']
const LANGUAGES = ['any', 'en', 'es']

export default function FilterPanel({ filters, onChange, type = 'event' }) {
  const { t } = useLang()

  function set(key, value) {
    onChange({ ...filters, [key]: value })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">

      {/* Distance */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          {t.filters.distance}
        </p>
        <div className="flex gap-2 flex-wrap">
          {DISTANCES.map(d => (
            <button
              key={d}
              onClick={() => set('maxDistance', d)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                filters.maxDistance === d
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'border-gray-200 text-gray-600 hover:border-teal-400'
              }`}
            >
              {d} {t.filters.miles}
            </button>
          ))}
        </div>
      </div>

      {/* Food type — only for events and orgs */}
      {(type === 'event' || type === 'org') && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {t.filters.food_type}
          </p>
          <div className="flex gap-2 flex-wrap">
            {FOOD_TYPES.map(f => (
              <button
                key={f}
                onClick={() => set('foodType', f)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors capitalize ${
                  (filters.foodType ?? 'all') === f
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'border-gray-200 text-gray-600 hover:border-teal-400'
                }`}
              >
                {f === 'all' ? t.filters.all : f}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Schedule */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          {t.filters.schedule}
        </p>
        <div className="flex gap-2 flex-wrap">
          {SCHEDULES.map(s => (
            <button
              key={s}
              onClick={() => set('schedule', s)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                (filters.schedule ?? 'any_day') === s
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'border-gray-200 text-gray-600 hover:border-teal-400'
              }`}
            >
              {t.filters[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          {t.filters.language}
        </p>
        <div className="flex gap-2 flex-wrap">
          {LANGUAGES.map(l => (
            <button
              key={l}
              onClick={() => set('language', l)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                (filters.language ?? 'any') === l
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'border-gray-200 text-gray-600 hover:border-teal-400'
              }`}
            >
              {l === 'any' ? t.filters.any_lang : l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={() => onChange({ maxDistance: 10 })}
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        {t.filters.reset}
      </button>
    </div>
  )
}
