import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang, useUserLocation } from '../App'
import SearchBar from '../components/SearchBar'
import LanguageToggle from '../components/LanguageToggle'
import { useData } from '../hooks/useData'

// ── Reliable external link opener ───────────────────────────────
// Using window.open avoids HashRouter interference and popup-blocker
// issues that can affect target="_blank" on GitHub Pages.
function openExternal(url) {
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// ── Bot config ───────────────────────────────────────────────────
const BOT_USERNAME = 'nourishnet_bot'
const TELEGRAM_URL = `https://t.me/${BOT_USERNAME}`

// ── Telegram icon ────────────────────────────────────────────────
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

// ── Role cards ───────────────────────────────────────────────────
const ROLES = [
  { key: 'family',    route: '/families',   emoji: '🏠',
    iconBg: 'bg-teal-100',  border: 'hover:border-teal-400 hover:bg-teal-50',  arrow: 'text-teal-400' },
  { key: 'donor',     route: '/donors',     emoji: '💚',
    iconBg: 'bg-blue-100',  border: 'hover:border-blue-400 hover:bg-blue-50',  arrow: 'text-blue-400' },
  { key: 'volunteer', route: '/volunteers', emoji: '🙋',
    iconBg: 'bg-green-100', border: 'hover:border-green-400 hover:bg-green-50', arrow: 'text-green-400' },
]

// ── How it works steps ───────────────────────────────────────────
const HOW_STEPS = [
  { emoji: '📍', title: 'Enter your ZIP code',  desc: 'We find food events, donor organisations, and volunteer opportunities closest to you.' },
  { emoji: '🎯', title: 'Choose your role',      desc: 'Are you looking for food, want to donate, or want to volunteer? Each path is tailored.' },
  { emoji: '🗺️', title: 'See what\'s near you', desc: 'Browse an interactive map. Tap any pin to see hours, contact info, and directions.' },
]

// ── Telegram flow paths ──────────────────────────────────────────
const TG_DM_STEPS = [
  { icon: '📱', text: 'Message @nourishnet_bot directly' },
  { icon: '🤖', text: 'Bot extracts event details using AI' },
  { icon: '✅', text: 'You confirm with YES (or edit a detail)' },
  { icon: '🗺️', text: 'Live on NourishNet within 6 hours' },
]

const TG_GROUP_STEPS = [
  { icon: '👥', text: 'Post in DC Food Donation, UMD Pantry, or Maryland Food Volunteers' },
  { icon: '🤫', text: 'Bot reads silently — no disruption to the group' },
  { icon: '👍', text: 'Bot reacts with a thumbs-up if it detects a food event' },
  { icon: '🗺️', text: 'Event added to NourishNet automatically' },
]

export default function Landing() {
  const { t } = useLang()
  const navigate = useNavigate()
  const { setUserLocation } = useUserLocation()
  const { raw } = useData()
  const [resources, setResources] = useState([])

  // Fetch url_directory.json for the Resources section
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}url_directory.json`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setResources(Array.isArray(d) ? d : []))
      .catch(() => setResources([]))
  }, [])

  const stats = {
    events:        raw.filter(e => e.entity_type === 'event').length,
    orgs:          raw.filter(e => e.entity_type === 'org').length,
    opportunities: raw.filter(e => e.entity_type === 'opportunity').length,
  }

  return (
    <div className="min-h-screen flex flex-col">

      {/* ════════════════════════════════════════════════════
          HERO — two-column
          ════════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row" style={{ minHeight: '100vh' }}>

        {/* Left — role cards + telegram */}
        <div className="w-full md:w-[400px] flex-shrink-0 bg-white border-r border-gray-100
                        flex flex-col px-8 py-8">

          <div className="mb-8">
            <div className="flex items-center gap-2 font-bold text-teal-700 text-2xl mb-1">
              <span>🥦</span><span>{t.app.name}</span>
            </div>
            <p className="text-gray-400 text-sm">DC & Maryland food resources</p>
          </div>

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
                  <p className="text-sm text-gray-400 mt-0.5">{t.landing.roles[role.key].sub}</p>
                </div>
                <span className={`${role.arrow} text-xl opacity-0 group-hover:opacity-100
                                  transition-opacity flex-shrink-0`}>→</span>
              </button>
            ))}
          </div>

          {/* Telegram bot card */}
          <div className="mt-8 rounded-2xl bg-sky-50 border border-sky-100 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background: '#2AABEE' }}>
                <TelegramIcon size={20} />
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm leading-tight">Event organizer?</p>
                <p className="text-xs text-gray-400">Add your event in 30 seconds</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => openExternal(TELEGRAM_URL)}
                className="flex-1 text-white text-xs font-semibold py-2.5 px-3 rounded-xl
                           text-center transition-opacity hover:opacity-90 cursor-pointer"
                style={{ background: '#2AABEE' }}>
                @{BOT_USERNAME}
              </button>
              <button onClick={() => navigate('/submit')}
                      className="flex-1 border border-sky-200 text-sky-600 hover:bg-sky-100
                                 text-xs font-semibold py-2.5 px-3 rounded-xl transition-colors">
                Learn more →
              </button>
            </div>
          </div>
        </div>

        {/* Right — headline + search */}
        <div className="flex-1 bg-gradient-to-br from-teal-50 via-white to-blue-50
                        flex flex-col items-center justify-center px-10 py-12 relative">
          <div className="absolute top-5 right-5"><LanguageToggle /></div>

          <div className="w-full max-w-md">
            <h1 className="text-4xl font-bold text-gray-900 leading-tight mb-3">{t.landing.hero}</h1>
            <p className="text-gray-500 text-lg leading-relaxed mb-10">{t.landing.sub}</p>

            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 mb-8">
              <SearchBar onLocation={loc => { setUserLocation(loc); navigate('/families') }} />
            </div>

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

          {/* Scroll hint */}
          <div className="absolute bottom-6 flex flex-col items-center gap-1 text-gray-300">
            <p className="text-xs">scroll to learn more</p>
            <span className="text-lg animate-bounce">↓</span>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          HOW IT WORKS
          ════════════════════════════════════════════════════ */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold text-teal-600 tracking-widest uppercase mb-2 text-center">
            Getting started
          </p>
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            How to use NourishNet
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_STEPS.map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                {/* Step number + emoji */}
                <div className="relative mb-5">
                  <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center
                                  justify-center text-4xl">
                    {step.emoji}
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 bg-teal-600 rounded-full
                                  flex items-center justify-center text-white text-xs font-bold">
                    {i + 1}
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>

                {/* Connector arrow (not on last) */}
                {i < HOW_STEPS.length - 1 && (
                  <div className="hidden md:block absolute" style={{ display: 'none' }} />
                )}
              </div>
            ))}
          </div>

          {/* Arrow connectors between steps on desktop */}
          <div className="hidden md:flex justify-center gap-0 mt-2 -translate-y-16 pointer-events-none">
            <div className="flex-1" />
            <div className="flex items-center text-gray-200 text-3xl px-4">→</div>
            <div className="flex-1" />
            <div className="flex items-center text-gray-200 text-3xl px-4">→</div>
            <div className="flex-1" />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          TELEGRAM BOT SECTION
          ════════════════════════════════════════════════════ */}
      <section className="bg-gradient-to-br from-sky-50 to-blue-50 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: '#2AABEE' }}>
              <TelegramIcon size={22} />
            </div>
            <p className="text-xs font-bold text-sky-600 tracking-widest uppercase">
              Telegram Bot
            </p>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">
            Add your event via Telegram
          </h2>
          <p className="text-gray-500 text-center max-w-xl mx-auto mb-12">
            NourishNet's Telegram bot works in two ways — organizers can message it directly,
            or the bot quietly listens in community groups where food events are already discussed.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Path 1 — Direct message */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-sky-100">
              <div className="flex items-center gap-2 mb-5">
                <span className="text-2xl">📱</span>
                <div>
                  <p className="font-bold text-gray-900">Message the bot directly</p>
                  <p className="text-xs text-gray-400">Takes 30 seconds</p>
                </div>
              </div>

              <div className="space-y-3">
                {TG_DM_STEPS.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-7 h-7 bg-sky-100 rounded-full flex items-center
                                    justify-center text-sm flex-shrink-0 mt-0.5">
                      {step.icon}
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed pt-1">{step.text}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => openExternal(TELEGRAM_URL)}
                className="mt-6 flex items-center justify-center gap-2 w-full py-3 rounded-xl
                           text-white text-sm font-semibold transition-opacity hover:opacity-90
                           cursor-pointer"
                style={{ background: '#2AABEE' }}>
                <TelegramIcon size={18} />
                Open @{BOT_USERNAME}
              </button>
            </div>

            {/* Path 2 — Group monitoring */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-sky-100">
              <div className="flex items-center gap-2 mb-5">
                <span className="text-2xl">👥</span>
                <div>
                  <p className="font-bold text-gray-900">Bot listens in group chats</p>
                  <p className="text-xs text-gray-400">No action needed from you</p>
                </div>
              </div>

              <div className="space-y-3">
                {TG_GROUP_STEPS.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-7 h-7 bg-sky-100 rounded-full flex items-center
                                    justify-center text-sm flex-shrink-0 mt-0.5">
                      {step.icon}
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed pt-1">{step.text}</p>
                  </div>
                ))}
              </div>

              {/* Active groups pill list */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Active groups
                </p>
                <div className="flex flex-wrap gap-2">
                  {['DC Food Donation', 'UMD Pantry', 'Maryland Food Volunteers'].map(g => (
                    <span key={g}
                          className="text-xs bg-sky-50 text-sky-700 border border-sky-100
                                     px-3 py-1 rounded-full font-medium">
                      👥 {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          RESOURCES — data sources
          ════════════════════════════════════════════════════ */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold text-teal-600 tracking-widest uppercase mb-2 text-center">
            Transparency
          </p>
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">
            Where our data comes from
          </h2>
          <p className="text-gray-500 text-center max-w-xl mx-auto mb-10">
            NourishNet automatically scrapes and updates data from these sources every 6 hours.
            New sources are discovered and added continuously.
          </p>

          {resources.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Fallback static list if url_directory.json hasn't loaded */}
              {[
                { label: 'Capital Area Food Bank',  url: 'https://www.capitalareafoodbank.org' },
                { label: 'Maryland Food Bank',       url: 'https://www.marylandfoodbank.org' },
                { label: 'DC DHS Food Assistance',   url: 'https://dhs.dc.gov/service/food-assistance' },
                { label: 'Feeding America',           url: 'https://www.feedingamerica.org' },
              ].map(r => <ResourceCard key={r.url} label={r.label} url={r.url} status="seed" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {resources.map((r, i) => (
                <ResourceCard key={i} label={r.label} url={r.url} status={r.status} />
              ))}
            </div>
          )}

          <p className="text-center text-xs text-gray-400 mt-8">
            + sources discovered automatically by the pipeline each run ·
            <button onClick={() => navigate('/submit')}
                    className="text-teal-600 hover:underline ml-1">
              Add your own source →
            </button>
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          FOOTER
          ════════════════════════════════════════════════════ */}
      <footer className="bg-gray-50 border-t border-gray-100 py-8 px-6 text-center">
        <div className="flex items-center justify-center gap-2 font-bold text-teal-700 text-lg mb-2">
          <span>🥦</span><span>NourishNet</span>
        </div>
        <p className="text-xs text-gray-400">
          Built for DC & Maryland communities · Data updated every 6 hours ·
          Open source · No ads · No tracking
        </p>
      </footer>
    </div>
  )
}

// ── Resource card component ──────────────────────────────────────
function ResourceCard({ label, url, status }) {
  const hostname = (() => {
    try { return new URL(url).hostname.replace('www.', '') }
    catch { return url }
  })()

  const statusConfig = {
    seed:       { bg: 'bg-teal-50',  text: 'text-teal-700',  dot: 'bg-teal-400',  label: 'Core source' },
    discovered: { bg: 'bg-blue-50',  text: 'text-blue-700',  dot: 'bg-blue-400',  label: 'Auto-discovered' },
    active:     { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-400', label: 'Active' },
    failed:     { bg: 'bg-gray-50',  text: 'text-gray-500',  dot: 'bg-gray-300',  label: 'Inactive' },
  }[status] ?? { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-300', label: status }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
       className="flex items-center gap-3 p-4 rounded-xl border border-gray-100
                  hover:border-teal-200 hover:bg-teal-50 transition-all group">
      {/* Favicon */}
      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center
                      flex-shrink-0 overflow-hidden">
        <img
          src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
          alt=""
          className="w-5 h-5"
          onError={e => { e.target.style.display = 'none' }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-800 truncate group-hover:text-teal-700
                      transition-colors">
          {label}
        </p>
        <p className="text-xs text-gray-400 truncate">{hostname}</p>
      </div>

      {/* Status badge */}
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full flex-shrink-0
                       ${statusConfig.bg}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
        <span className={`text-xs font-medium ${statusConfig.text}`}>{statusConfig.label}</span>
      </div>
    </a>
  )
}
