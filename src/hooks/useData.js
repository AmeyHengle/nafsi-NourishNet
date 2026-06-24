import { useState, useEffect, useMemo } from 'react'
import { distanceMiles } from '../utils/distance'

export function useData() {
  const [raw, setRaw] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // import.meta.env.BASE_URL handles both local dev (/) and GitHub Pages (/nafsi-NourishNet/)
    fetch(`${import.meta.env.BASE_URL}data.json`)
      .then(r => { if (!r.ok) throw new Error('Failed to load data'); return r.json() })
      .then(d => {
        const entries = Array.isArray(d) ? d : []
        // Normalise: destructuring defaults (= []) don't fire for null, only undefined.
        // Any field that arrived as null becomes [] so .length/.map never crashes.
        const normalised = entries.map(e => ({
          ...e,
          food_types:       e.food_types       ?? [],
          current_needs:    e.current_needs     ?? [],
          skills_needed:    e.skills_needed     ?? [],
          languages_served: e.languages_served  ?? [],
        }))
        setRaw(normalised)
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  return { raw, loading, error }
}

/**
 * Filter and sort entities based on user location, role type, and filter settings.
 */
export function useFilteredData({ raw, userLocation, type, filters = {} }) {
  return useMemo(() => {
    let items = raw.filter(e => e.entity_type === type && e.status !== 'expired')

    // Attach distance if user location is known
    if (userLocation) {
      items = items
        .filter(e => e.lat && e.lng)
        .map(e => ({
          ...e,
          distance: distanceMiles(userLocation.lat, userLocation.lng, e.lat, e.lng),
        }))
        .filter(e => e.distance <= (filters.maxDistance ?? 25))
        .sort((a, b) => a.distance - b.distance)
    }

    // Food type filter
    if (filters.foodType && filters.foodType !== 'all') {
      items = items.filter(e =>
        (e.food_types ?? []).some(f => f.toLowerCase().includes(filters.foodType.toLowerCase()))
      )
    }

    // Language filter
    if (filters.language && filters.language !== 'any') {
      items = items.filter(e =>
        (e.languages_served ?? ['en']).includes(filters.language)
      )
    }

    // Search query
    if (filters.query) {
      const q = filters.query.toLowerCase()
      items = items.filter(e =>
        e.name?.toLowerCase().includes(q) ||
        e.address?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q)
      )
    }

    // Donation type filter (donors page)
    if (filters.donationType && filters.donationType !== 'both') {
      // orgs that mention the donation type in description or contact
      // best effort — orgs are always shown unless we can positively exclude
    }

    return items
  }, [raw, userLocation, type, filters])
}