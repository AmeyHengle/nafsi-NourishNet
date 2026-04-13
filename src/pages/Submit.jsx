import { useNavigate } from 'react-router-dom'
import { useLang } from '../App'
import { useData } from '../hooks/useData'
import Navbar from '../components/Navbar'
import CommunityBadge from '../components/CommunityBadge'

// Replace with your actual bot username after creating it with BotFather
const BOT_USERNAME = 'nafsi_nourishnet_bot'
const TELEGRAM_URL = `https://t.me/${BOT_USERNAME}`

const STEPS = ['step1', 'step2', 'step3']

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
                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed pt-1">{t.submit[step]}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 btn-primary text-center py-3 text-sm font-semibold"
          >
            ✈ {t.submit.open_bot}
          </a>
          <button
            onClick={() => navigate(-1)}
            className="flex-1 btn-secondary py-3 text-sm"
          >
            ← Back
          </button>
        </div>

        {/* QR code section */}
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 text-center">
          <p className="text-sm text-gray-500 mb-4">{t.submit.scan}</p>
          {/* QR code as simple visual placeholder — replace with a real QR image */}
          <div className="inline-block bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="w-32 h-32 flex items-center justify-center text-gray-300 text-xs text-center">
              <div>
                <p className="text-3xl mb-2">📱</p>
                <p>QR code for</p>
                <p className="font-mono text-teal-600">@{BOT_USERNAME}</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Telegram: <span className="font-mono text-teal-600">@{BOT_USERNAME}</span>
          </p>
        </div>

        {/* Community events list */}
        {communityEvents.length > 0 && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-4">
              {t.submit.community_title}
              <span className="ml-2 badge bg-teal-50 text-teal-700 border border-teal-200">
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
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
