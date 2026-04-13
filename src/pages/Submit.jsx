import { useNavigate } from 'react-router-dom'
import { useLang } from '../App'
import { useData } from '../hooks/useData'
import Navbar from '../components/Navbar'
import CommunityBadge from '../components/CommunityBadge'

function openExternal(url) {
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

const BOT_USERNAME = 'nourishnet_bot'
const TELEGRAM_URL = `https://t.me/${BOT_USERNAME}`

const STEPS = ['step1', 'step2', 'step3']

function TelegramIcon({ size = 20 }) {
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

export default function Submit() {
  const { t } = useLang()
  const navigate = useNavigate()
  const { raw } = useData()

  const communityEvents = raw.filter(e => e.source === 'community')

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-10 space-y-10">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t.submit.title}</h1>
          <p className="text-gray-500 leading-relaxed">{t.submit.sub}</p>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-5">{t.submit.how_it_works}</h2>
          <div className="space-y-4">
            {STEPS.map((step, i) => (
              <div key={step} className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center
                                justify-center text-sm font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed pt-1">{t.submit[step]}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => openExternal(TELEGRAM_URL)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                       text-white text-sm font-semibold transition-opacity hover:opacity-90
                       cursor-pointer"
            style={{ background: '#2AABEE' }}
          >
            <TelegramIcon size={18} />
            @{BOT_USERNAME}
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex-1 btn-secondary py-3 text-sm"
          >
            ← Back
          </button>
        </div>

        {/* QR / handle section */}
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 text-center">
          <p className="text-sm text-gray-500 mb-4">{t.submit.scan}</p>
          <div className="inline-block bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="w-32 h-32 flex items-center justify-center text-center">
              <div>
                <div className="flex justify-center mb-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                       style={{ background: '#2AABEE' }}>
                    <TelegramIcon size={24} />
                  </div>
                </div>
                <p className="text-xs text-gray-400">Telegram bot</p>
                <p className="font-mono text-sm font-bold text-sky-600 mt-1">@{BOT_USERNAME}</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Open Telegram and search for <span className="font-mono font-semibold text-sky-600">@{BOT_USERNAME}</span>
          </p>
        </div>

        {/* Community events list */}
        {communityEvents.length > 0 && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              {t.submit.community_title}
              <span className="badge bg-teal-50 text-teal-700 border border-teal-200">
                {communityEvents.length}
              </span>
            </h2>
            <p className="text-sm text-gray-500 mb-4">{t.submit.community_sub}</p>
            <div className="space-y-3">
              {communityEvents.map((e, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-medium text-sm text-gray-900">{e.name}</p>
                    <CommunityBadge source={e.source} status={e.status} />
                  </div>
                  {e.address && <p className="text-xs text-gray-500">📍 {e.address}</p>}
                  {e.hours   && <p className="text-xs text-teal-700 mt-1">🕐 {e.hours}</p>}
                  {e.telegram_group_name && (
                    <p className="text-xs text-sky-500 mt-1">
                      ✈ From {e.telegram_group_name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
