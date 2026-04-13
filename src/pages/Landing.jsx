import { useNavigate } from 'react-router-dom'
import { useLang, useUserLocation } from '../App'
import SearchBar from '../components/SearchBar'
import LanguageToggle from '../components/LanguageToggle'
import { useData } from '../hooks/useData'

// ── Telegram paper-plane icon ───────────────────────────────────
function TelegramIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="12" fill="#2AABEE" />
      <path
        d="M5.1 11.4l13-5c.6-.2 1.1.1.9.8l-2.2 10.3c-.2.7-.6.9-1.2.5l-3.3-2.4-1.6 1.5c-.2.2-.4.3-.7.3l.2-3.4 5.5-5c.2-.2 0-.3-.3-.1L7.2 13.2l-2.1-.7c-.7-.2-.7-.7 0-.9z"
        fill="white"
      />
    </svg>
  )
}

const ROLES = [
  {
    key:        'family',
    route:      '/families',
    emoji:      '🏠',
    iconBg:     'bg-teal-100',
    border:     'hover:border-teal-400 hover:bg-teal-50',
    arrowColor: 'text-teal-400',
  },
  {
    key:        'donor',
    route:      '/donors',
    emoji:      '💚',
    iconBg:     'bg-blue-100',
    border:     'hover:border-blue-400 hover:bg-blue-50',
    arrowColor: 'text-blue-400',
  },
  {
    key:        'volunteer',
    route:      '/volunteers',
    emoji:      '🙋',
    iconBg:     'bg-green-100',
    border:     'hover:border-green-400 hover:bg-green-50',
    arrowColor: 'text-green-400',
  },
]

const BOT_USERNAME = 'nafsi_nourishnet_bot'
const TELEGRAM_URL = `https://t.me/${BOT_USERNAME}`

export default function Landing() {
  const { t } = useLang()
  const navigate = useNavigate()
  const { setUserLocation } = useUserLocation()
  const { raw } = useData()

  const stats = {
    events:        raw.filter(e => e.entity_type === 'event').length,
    orgs:          raw.filter(e => e.entity_type === 'org').length,
    opportunities: raw.filter(e => e.entity_type === 'opportunity').length,
  }

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden">

      {/* ════════════════════════════════════════════════════
          LEFT COLUMN — logo + role cards + telegram section
          ════════════════════════════════════════════════════ */}
      <div className="w-full md:w-[400px] flex-shrink-0 bg-white border-r border-gray-100
                      flex flex-col px-8 py-8 overflow-y-auto">

        {/* Logo */}
        <div className="mb-8">
          <div className="flex items-center gap-2 font-bold text-teal-700 text-2xl mb-1">
            <span>🥦</span><span>{t.app.name}</span>
          </div>
          <p className="text-gray-400 text-sm">DC & Maryland food resources</p>
        </div>

        {/* Role cards — stacked vertically, large */}
        <div className="flex flex-col gap-3 flex-1 justify-center">
          {ROLES.map(role => (
            <button
              key={role.key}
              onClick={() => navigate(role.route)}
              className={`w-full p-5 rounded-2xl border-2 border-gray-100 text-left
                          flex items-center gap-4 group transition-all ${role.border}`}
            >
              <div className={`w-14 h-14 ${role.iconBg} rounded-2xl flex items-center
                               justify-center text-3xl flex-shrink-0 transition-transform
                               group-hover:scale-110`}>
                {role.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-lg leading-tight">
                  {t.landing.roles[role.key].title}
                </p>
                <p className="text-sm text-gray-400 mt-0.5 leading-snug">
                  {t.landing.roles[role.key].sub}
                </p>
              </div>
              <span className={`${role.arrowColor} text-xl opacity-0 group-hover:opacity-100
                                transition-opacity flex-shrink-0`}>
                →
              </span>
            </button>
          ))}
        </div>

        {/* ── Telegram bot card ──────────────────────────── */}
        <div className="mt-8 rounded-2xl bg-sky-50 border border-sky-100 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center
                            flex-shrink-0" style={{ background: '#2AABEE' }}>
              <TelegramIcon size={20} />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm leading-tight">
                Event organizer?
              </p>
              <p className="text-xs text-gray-400">Add your event in 30 seconds</p>
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-white text-xs font-semibold py-2.5 px-3 rounded-xl
                         text-center transition-opacity hover:opacity-90"
              style={{ background: '#2AABEE' }}
            >
              Open Telegram Bot
            </a>
            <button
              onClick={() => navigate('/submit')}
              className="flex-1 border border-sky-200 text-sky-600 hover:bg-sky-100
                         text-xs font-semibold py-2.5 px-3 rounded-xl transition-colors"
            >
              Learn more →
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          RIGHT COLUMN — headline + ZIP search + stats
          ════════════════════════════════════════════════ */}
      <div className="flex-1 bg-gradient-to-br from-teal-50 via-white to-blue-50
                      flex flex-col items-center justify-center px-10 py-12 relative
                      overflow-y-auto">

        {/* Language toggle */}
        <div className="absolute top-5 right-5">
          <LanguageToggle />
        </div>

        <div className="w-full max-w-md">

          {/* Headline */}
          <h1 className="text-4xl font-bold text-gray-900 leading-tight mb-3">
            {t.landing.hero}
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed mb-10">
            {t.landing.sub}
          </p>

          {/* ZIP search — no duplicate label */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 mb-8">
            <SearchBar
              onLocation={loc => {
                setUserLocation(loc)
                navigate('/families')
              }}
            />
          </div>

          {/* Stats */}
          {(stats.events + stats.orgs + stats.opportunities) > 0 && (
            <div className="flex justify-center gap-10">
              {stats.events > 0 && (
                <div className="text-center">
                  <p className="text-3xl font-bold text-teal-600">{stats.events}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.landing.stats.events}</p>
                </div>
              )}
              {stats.orgs > 0 && (
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{stats.orgs}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.landing.stats.orgs}</p>
                </div>
              )}
              {stats.opportunities > 0 && (
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{stats.opportunities}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.landing.stats.opportunities}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="absolute bottom-4 text-xs text-gray-300">
          NourishNet · Data updated every 6 hours
        </p>
      </div>
    </div>
  )
}
