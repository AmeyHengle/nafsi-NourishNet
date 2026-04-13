import { useState } from 'react'
import { geocodeZip } from '../utils/geocode'
import { useLang } from '../App'

export default function SearchBar({ onLocation, compact = false }) {
  const { t } = useLang()
  const [zip, setZip] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSearch(e) {
    e.preventDefault()
    if (!zip.trim()) return
    setLoading(true)
    setError(null)
    const result = await geocodeZip(zip)
    setLoading(false)
    if (result) {
      onLocation({ ...result, zip })
    } else {
      setError('ZIP code not found. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSearch} className={compact ? 'flex gap-2' : 'flex flex-col gap-2'}>
      <div className="flex gap-2">
        <input
          type="text"
          value={zip}
          onChange={e => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
          placeholder={t.landing.zip_placeholder}
          maxLength={5}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={loading || zip.length < 5}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {loading ? '…' : t.landing.search}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </form>
  )
}
