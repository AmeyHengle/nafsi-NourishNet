import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

// ── Walkthrough data ────────────────────────────────────────────
const WALKTHROUGHS = [
  {
    key: 'family', emoji: '🏠', label: 'Finding food',
    color: '#0d9488', bg: '#f0fdfa', border: '#5eead4',
    steps: [
      { icon: '📍', title: 'Enter your ZIP code', desc: 'Type your ZIP on the home page and press Search. No account or sign-up needed.' },
      { icon: '🗺️', title: 'See events near you', desc: 'A map appears with food events as coloured pins, listed on the left sorted nearest to furthest.' },
      { icon: '🔍', title: 'Filter by what you need', desc: 'Filter by food type (produce, hot meals…), distance, schedule, or language. Results update instantly.' },
      { icon: '📋', title: 'Tap any event for full details', desc: 'See hours, eligibility like "No ID required", what food is available, and the organiser\'s contact info.' },
      { icon: '🧭', title: 'Get directions in one tap', desc: 'Tap "Get Directions" to open Google Maps with the event already loaded as your destination.' },
    ]
  },
  {
    key: 'donor', emoji: '💚', label: 'Donating',
    color: '#2563eb', bg: '#eff6ff', border: '#93c5fd',
    steps: [
      { icon: '📍', title: 'Enter your ZIP code', desc: 'Start on the home page or tap "I want to donate" directly from the role cards.' },
      { icon: '🎯', title: 'Tell us what you want to donate', desc: 'Pick food items, money, or both. This filters results to show the most relevant organisations near you.' },
      { icon: '📋', title: 'Browse matched organisations', desc: 'Each card shows what the organisation currently needs most, drop-off hours, and how far away they are.' },
      { icon: '📞', title: 'Get in touch or donate online', desc: 'Expand any card for full contact info, then use "Visit Website" or "Donate Now" to take action.' },
    ]
  },
  {
    key: 'volunteer', emoji: '🙋', label: 'Volunteering',
    color: '#16a34a', bg: '#f0fdf4', border: '#86efac',
    steps: [
      { icon: '📍', title: 'Enter your ZIP code', desc: 'Start on the home page or tap "I want to volunteer" from the role cards.' },
      { icon: '🗺️', title: 'Browse opportunities near you', desc: 'Opportunities are sorted by distance. Look for the red Urgent badge — those need help soonest.' },
      { icon: '🛠️', title: 'Check skills and schedule', desc: 'Each card shows what skills are needed, when to show up, and how many spots are still open.' },
      { icon: '✅', title: 'Sign up in one tap', desc: 'Use the Sign Up button to go directly to the registration page, or contact the organiser from the card.' },
    ]
  },
  {
    key: 'organizer', emoji: '📢', label: 'Adding your event',
    color: '#7c3aed', bg: '#faf5ff', border: '#c4b5fd',
    steps: [
      { icon: '✈', title: 'Open @nourishnet_bot on Telegram', desc: 'Search for the bot on Telegram and tap Start. No account or sign-up needed.' },
      { icon: '💬', title: 'Describe your event in plain text', desc: 'Type what you\'d normally write in a group chat — location, date, time, who can come. Photos of flyers also work.' },
      { icon: '📋', title: 'Bot extracts and shows you a summary', desc: 'The bot reads your message and shows the key details it found. Reply EDIT to correct anything.' },
      { icon: '✅', title: 'Reply YES to confirm', desc: 'Once confirmed, your event is queued. It appears on the NourishNet map within one hour.' },
    ]
  },
]

// ── Overview Diagram ─────────────────────────────────────────────
function OverviewDiagram() {
  const cardStyle = (border, bg) => ({
    border: `1.5px solid ${border}`,
    background: bg,
    borderRadius: 14, padding: '12px 10px',
    textAlign: 'center', minWidth: 108, maxWidth: 130,
  })

  const sources = [
    { emoji: '🌐', label: 'Food bank websites', sub: 'scraped every hour',    border: '#5eead4', bg: '#f0fdfa', tc: '#0f766e' },
    { emoji: '✈',  label: 'DC Food Donation',    sub: 'Telegram group',        border: '#7dd3fc', bg: '#eff9ff', tc: '#0369a1' },
    { emoji: '✈',  label: 'UMD Pantry',          sub: 'Telegram group',        border: '#7dd3fc', bg: '#eff9ff', tc: '#0369a1' },
    { emoji: '✈',  label: 'MD Food Volunteers',  sub: 'Telegram group',        border: '#7dd3fc', bg: '#eff9ff', tc: '#0369a1' },
    { emoji: '📱', label: 'Direct messages',      sub: 'to @nourishnet_bot',    border: '#c4b5fd', bg: '#faf5ff', tc: '#6d28d9' },
  ]
  const outputs = [
    { emoji: '🏠', label: 'Families',   sub: 'find food events near you',   border: '#5eead4', bg: '#f0fdfa', tc: '#0f766e' },
    { emoji: '💚', label: 'Donors',     sub: 'match with organisations',     border: '#93c5fd', bg: '#eff6ff', tc: '#1d4ed8' },
    { emoji: '🙋', label: 'Volunteers', sub: 'find nearby opportunities',    border: '#86efac', bg: '#f0fdf4', tc: '#166534' },
  ]
  const tags = [
    { label: 'AI reads messages', bg: '#ccfbf1', color: '#0f766e', border: '#99f6e4' },
    { label: 'removes duplicates', bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
    { label: 'quality check',     bg: '#ede9fe', color: '#6d28d9', border: '#ddd6fe' },
    { label: 'pins on map',       bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  ]

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '8px 0' }}>
      {/* Problem banner */}
      <div style={{ background: 'var(--color-background-secondary)', border: '1px dashed var(--color-border-secondary)',
                    borderRadius: 12, padding: '10px 16px', textAlign: 'center', maxWidth: 540,
                    margin: '0 auto 20px', fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
        Food event info is scattered across websites, group chats & forwarded messages.
        <strong style={{ color: 'var(--color-text-primary)' }}> NourishNet Bot collects it all automatically.</strong>
      </div>

      {/* Sources */}
      <p style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: '.12em',
                  textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: 10 }}>
        where information comes from
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
        {sources.map((s, i) => (
          <div key={i} style={cardStyle(s.border, s.bg)}>
            <div style={{ fontSize: 24, lineHeight: 1, marginBottom: 6 }}>{s.emoji}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: s.tc, lineHeight: 1.3 }}>{s.label}</div>
            <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 3 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Arrow */}
      <div style={{ textAlign: 'center', fontSize: 22, color: 'var(--color-text-tertiary)', margin: '14px 0' }}>↓</div>

      {/* Hub */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                    border: '2px solid var(--color-border-secondary)', borderRadius: 20,
                    padding: '16px 20px', margin: '0 auto', maxWidth: 360,
                    textAlign: 'center', background: 'var(--color-background-secondary)' }}>
        <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 8 }}>✈</div>
        <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--color-text-primary)' }}>NourishNet Bot</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 6,
                      lineHeight: 1.6, maxWidth: 280 }}>
          Reads everything, removes duplicates, checks quality, and adds events to the live map — automatically, 24/7
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 5, marginTop: 10 }}>
          {tags.map((t, i) => (
            <span key={i} style={{ fontSize: 10, fontWeight: 500, padding: '2px 9px',
                                    borderRadius: 20, border: `1px solid ${t.border}`,
                                    background: t.bg, color: t.color }}>{t.label}</span>
          ))}
        </div>
      </div>

      {/* Arrow */}
      <div style={{ textAlign: 'center', fontSize: 22, color: 'var(--color-text-tertiary)', margin: '14px 0' }}>↓</div>

      {/* Outputs */}
      <p style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: '.12em',
                  textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: 10 }}>
        who gets connected
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
        {outputs.map((o, i) => (
          <div key={i} style={{ ...cardStyle(o.border, o.bg), minWidth: 145, maxWidth: 160, padding: '14px 12px' }}>
            <div style={{ fontSize: 28, lineHeight: 1, marginBottom: 8 }}>{o.emoji}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: o.tc }}>{o.label}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4, lineHeight: 1.4 }}>{o.sub}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Telegram Bot Diagram ─────────────────────────────────────────
function TelegramDiagram() {
  const TG = '#2AABEE'

  const userBubble = (text) => (
    <div style={{ background: TG, color: '#fff', borderRadius: '12px 12px 4px 12px',
                  padding: '8px 11px', fontSize: 11, lineHeight: 1.5, margin: '4px 0',
                  marginLeft: 16, whiteSpace: 'pre-line' }}>{text}</div>
  )
  const botBubble = (text) => (
    <div style={{ background: 'var(--color-background-secondary)',
                  border: '1px solid var(--color-border-secondary)',
                  color: 'var(--color-text-primary)',
                  borderRadius: '12px 12px 12px 4px', padding: '8px 11px',
                  fontSize: 11, lineHeight: 1.6, margin: '4px 0', marginRight: 16 }}
         dangerouslySetInnerHTML={{ __html: text }} />
  )
  const confirmBubble = (text) => (
    <div style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0',
                  borderRadius: 12, padding: '8px 11px', fontSize: 11, fontWeight: 500,
                  textAlign: 'center', margin: '4px 0' }}>{text}</div>
  )

  const colHeader = (color, bg, icon, title, sub) => (
    <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--color-border-tertiary)',
                  background: bg }}>
      <div style={{ fontSize: 22, lineHeight: 1, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>{title}</div>
      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2, lineHeight: 1.4 }}>{sub}</div>
    </div>
  )

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Bot title */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 36, lineHeight: 1, marginBottom: 8 }}>✈</div>
        <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--color-text-primary)' }}>NourishNet Bot</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 3 }}>
          @nourishnet_bot · two ways it collects food event information
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Left panel — Direct message */}
        <div style={{ flex: 1, minWidth: 270, border: '1.5px solid var(--color-border-secondary)',
                      borderRadius: 16, overflow: 'hidden' }}>
          {colHeader(TG, '#eff9ff', '📱', 'Way 1 — Message the bot directly',
            'An organiser sends their event info straight to the bot. The bot extracts the details and asks for confirmation.')}
          <div style={{ padding: '14px 16px', background: 'var(--color-background-secondary)',
                        display: 'flex', flexDirection: 'column', gap: 12 }}>

            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                👩 Organiser sends a message
              </div>
              {userBubble('Hey! Free groceries this Saturday at MLK Library, 901 G St NW DC. 10am–2pm, no ID needed 🥦 Call Maria: (202) 555-0147')}
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                ✈ Bot reads and extracts the details
              </div>
              {botBubble('📋 Here\'s what I found:<br>📍 MLK Library, 901 G St NW DC<br>📅 This Saturday · 🕐 10am–2pm<br>✅ No ID required · 📞 (202) 555-0147<br><br>Reply <strong>YES</strong> to submit · <strong>NO</strong> to cancel · <strong>EDIT</strong> to fix a detail')}
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                👩 Organiser confirms
              </div>
              {userBubble('YES ✅')}
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                ✈ Bot confirms submission
              </div>
              {confirmBubble('✅ Submitted! Your event will be live within 1 hour.')}
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--color-border-tertiary)', padding: '10px 16px',
                        display: 'flex', gap: 8, alignItems: 'center',
                        background: 'var(--color-background-secondary)' }}>
            <span style={{ fontSize: 18 }}>🗺️</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
              Event appears on the map with a <strong style={{ color: 'var(--color-text-primary)' }}>Community submitted</strong> badge
            </span>
          </div>
        </div>

        {/* Right panel — Group monitoring */}
        <div style={{ flex: 1, minWidth: 270, border: '1.5px solid var(--color-border-secondary)',
                      borderRadius: 16, overflow: 'hidden' }}>
          {colHeader(TG, '#faf5ff', '👥', 'Way 2 — Bot listens in group chats',
            'Added to community groups, it reads every message quietly. Organisers don\'t need to do anything differently.')}
          <div style={{ padding: '14px 16px', background: 'var(--color-background-secondary)',
                        display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                ✈ Bot is active in these groups
              </div>
              {['DC Food Donation', 'UMD Pantry', 'MD Food Volunteers'].map(g => (
                <span key={g} style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                                       background: 'var(--color-background-secondary)',
                                       border: '1.5px solid #bae6fd', borderRadius: 20,
                                       padding: '4px 10px', fontSize: 11, fontWeight: 500,
                                       color: '#0369a1', margin: '3px 4px 3px 0' }}>
                  👥 {g}
                </span>
              ))}
              <div style={{ marginTop: 6, display: 'inline-block', background: '#fef3c7', color: '#92400e',
                             border: '1px solid #fde68a', borderRadius: 20, padding: '2px 10px',
                             fontSize: 10, fontWeight: 500 }}>
                🔇 completely silent — nobody knows it's there
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--color-border-tertiary)', paddingTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                💬 Someone posts in the group (as usual)
              </div>
              <div style={{ background: TG, color: '#fff', borderRadius: '12px 12px 4px 12px',
                             padding: '8px 11px', fontSize: 11, lineHeight: 1.5, margin: '4px 0' }}>
                📢 FREE FOOD this Thursday! Kingdom Life Church, 4321 Sheriff Rd NE DC. 11am–3pm. Open to all, no ID. Se habla español 🇪🇸
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                ✈ Bot detects it automatically
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Spots food-related keywords → AI reads the message → extracts event details → checks confidence level
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                👍 Bot reacts — and stays silent
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ background: '#eff9ff', border: '1.5px solid #7dd3fc', borderRadius: 20,
                                padding: '3px 10px', fontSize: 13, display: 'inline-flex',
                                alignItems: 'center', gap: 4 }}>
                  👍 <span style={{ fontSize: 11, color: '#0369a1', fontWeight: 500 }}>1</span>
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                  only visible action — no text reply sent to group
                </span>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--color-border-tertiary)', padding: '10px 16px',
                        display: 'flex', gap: 8, alignItems: 'center',
                        background: 'var(--color-background-secondary)' }}>
            <span style={{ fontSize: 18 }}>🗺️</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
              Event added automatically. The <strong style={{ color: 'var(--color-text-primary)' }}>original message</strong> is saved and shown on the map pin
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── App Walkthrough ──────────────────────────────────────────────
function AppWalkthrough() {
  const [active, setActive] = useState(0)
  const wt = WALKTHROUGHS[active]

  return (
    <div>
      {/* Tab pills */}
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        {WALKTHROUGHS.map((w, i) => (
          <button
            key={w.key}
            onClick={() => setActive(i)}
            style={active === i
              ? { background: w.color, color: '#fff', border: `2px solid ${w.color}` }
              : { background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)',
                  border: '2px solid var(--color-border-secondary)' }}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
          >
            <span>{w.emoji}</span>
            <span>{w.label}</span>
          </button>
        ))}
      </div>

      {/* Steps */}
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col gap-4">
          {wt.steps.map((step, i) => (
            <div key={i} className="flex gap-4 items-start">
              {/* Number circle */}
              <div style={{ background: wt.color, color: '#fff', width: 36, height: 36,
                             borderRadius: '50%', display: 'flex', alignItems: 'center',
                             justifyContent: 'center', fontWeight: 700, fontSize: 15,
                             flexShrink: 0, marginTop: 2 }}>
                {i + 1}
              </div>
              {/* Content */}
              <div style={{ background: wt.bg, border: `1.5px solid ${wt.border}`,
                             borderRadius: 12, padding: '12px 16px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 18 }}>{step.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: 14, color: wt.color }}>{step.title}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)',
                             lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────
export default function HowItWorks() {
  const navigate = useNavigate()

  const Section = ({ label, title, sub, children }) => (
    <section className="py-16 px-6">
      <div className="max-w-4xl mx-auto">
        <p className="text-xs font-bold text-teal-600 tracking-widest uppercase mb-2 text-center">{label}</p>
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">{title}</h2>
        {sub && <p className="text-gray-500 text-center max-w-xl mx-auto mb-10 text-sm leading-relaxed">{sub}</p>}
        {!sub && <div className="mb-10" />}
        {children}
      </div>
    </section>
  )

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      {/* Hero */}
      <div className="bg-white border-b border-gray-100 py-14 px-6 text-center">
        <p className="text-xs font-bold text-teal-600 tracking-widest uppercase mb-3">Documentation</p>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">How it works</h1>
        <p className="text-gray-500 max-w-xl mx-auto leading-relaxed">
          NourishNet Bot collects food event information from across the web and social media,
          and connects it to the families, donors, and volunteers who need it.
        </p>
      </div>

      {/* Section 1 — Overview */}
      <Section
        label="The big picture"
        title="One bot. Three sources. One map."
        sub="Food event information is scattered everywhere. NourishNet Bot automatically pulls it all together so you never have to search in multiple places."
      >
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <OverviewDiagram />
        </div>
      </Section>

      {/* Section 2 — Telegram Bot */}
      <Section
        label="NourishNet Bot"
        title="Two ways the bot collects information"
        sub="Organisers can message the bot directly, or the bot quietly listens in community groups where food events are already discussed. Either way, events reach the map automatically."
      >
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <TelegramDiagram />
        </div>
      </Section>

      {/* Section 3 — Walkthrough */}
      <Section
        label="App walkthrough"
        title="Step-by-step guide"
        sub="Choose your role below to see exactly how to use NourishNet for your needs."
      >
        <AppWalkthrough />
      </Section>

      {/* CTA */}
      <div className="bg-teal-600 py-14 px-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Ready to get started?</h2>
        <p className="text-teal-100 mb-8 text-sm">Find food events, donation opportunities, or volunteer roles near you.</p>
        <div className="flex flex-wrap gap-3 justify-center">
          {[
            { label: '🏠 Find food near me',    route: '/families'   },
            { label: '💚 I want to donate',      route: '/donors'     },
            { label: '🙋 I want to volunteer',   route: '/volunteers' },
          ].map(b => (
            <button key={b.route} onClick={() => navigate(b.route)}
                    className="bg-white text-teal-700 font-semibold px-5 py-2.5 rounded-xl
                               hover:bg-teal-50 transition-colors text-sm">
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <footer className="bg-white border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        NourishNet Bot · Built for DC & Maryland communities · Data updated every hour
      </footer>
    </div>
  )
}
