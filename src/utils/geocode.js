/**
 * Convert a US ZIP code to lat/lng using Zippopotam.us (free, no API key).
 * Returns { lat, lng, city, state } or null on failure.
 */
export async function geocodeZip(zip) {
  const clean = zip.trim().replace(/\D/g, '').slice(0, 5)
  if (clean.length !== 5) return null

  try {
    const res = await fetch(`https://api.zippopotam.us/us/${clean}`)
    if (!res.ok) return null
    const data = await res.json()
    const place = data.places?.[0]
    if (!place) return null
    return {
      lat: parseFloat(place.latitude),
      lng: parseFloat(place.longitude),
      city: place['place name'],
      state: place['state abbreviation'],
    }
  } catch {
    return null
  }
}
