/**
 * Haversine distance between two lat/lng points, in miles.
 */
export function distanceMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8 // Earth radius in miles
  const toRad = x => (x * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDistance(miles) {
  if (miles < 0.1) return '< 0.1 mi'
  if (miles < 10) return `${miles.toFixed(1)} mi`
  return `${Math.round(miles)} mi`
}
