import { createContext, useContext, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import en from './i18n/en'
import es from './i18n/es'
import Landing from './pages/Landing'
import Families from './pages/Families'
import Donors from './pages/Donors'
import Volunteers from './pages/Volunteers'
import Submit from './pages/Submit'

// ── Language context ────────────────────────────────────────────
const LangContext = createContext()

export function useLang() {
  return useContext(LangContext)
}

// ── Location context (shared across role pages) ─────────────────
const LocationContext = createContext()

export function useUserLocation() {
  return useContext(LocationContext)
}

// ── App ─────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang] = useState('en')
  const [userLocation, setUserLocation] = useState(null) // { lat, lng, city, state, zip }

  const t = lang === 'es' ? es : en

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      <LocationContext.Provider value={{ userLocation, setUserLocation }}>
        <div className="min-h-screen bg-gray-50 text-gray-900">
          <Routes>
            <Route path="/"           element={<Landing />} />
            <Route path="/families"   element={<Families />} />
            <Route path="/donors"     element={<Donors />} />
            <Route path="/volunteers" element={<Volunteers />} />
            <Route path="/submit"     element={<Submit />} />
            <Route path="*"           element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </LocationContext.Provider>
    </LangContext.Provider>
  )
}
