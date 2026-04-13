/**
 * Fetches live food distribution sites from the DC GIS ArcGIS REST API.
 *
 * Source: DC Open Data — Capital Area Food Bank Emergency Food Providers
 * URL: https://opendata.dc.gov/datasets/DCGIS::capital-area-food-bank-emergency-food-provider
 * License: CC BY 4.0 | Publisher: DC Office of Planning / Capital Area Food Bank
 *
 * Returns events normalized to NourishNet's entity schema so they integrate
 * transparently with data fetched from data.json.
 */

const CAFB_URL =
  'https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Public_Safety_WebMercator/MapServer/26/query'

const CAFB_PARAMS = {
  where: '1=1',
  outFields:
    'AGENCY_NAM,AGENCY_N_1,ADDRESS,CITY,STATE,ZIPCODE,PROGRAM,LATITUDE,LONGITUDE,KIDS_CAFE,COMMUNITY,WEEKEND_BA,FAMILY_MAR,GROCERY_PL',
  f: 'json',
  resultRecordCount: '1000',
  outSR: '4326',
}

// Map CAFB program booleans to NourishNet's food_types vocabulary
function deriveFoodTypes(p) {
  const types = new Set()

  if (p.KIDS_CAFE && p.KIDS_CAFE !== 'N') types.add('hot meals')
  if (p.COMMUNITY && p.COMMUNITY !== 'N') types.add('hot meals')
  if (p.WEEKEND_BA && p.WEEKEND_BA !== 'N') {
    types.add('bread')
    types.add('canned goods')
  }
  if (p.FAMILY_MAR && p.FAMILY_MAR !== 'N') {
    types.add('produce')
    types.add('canned goods')
  }
  if (p.GROCERY_PL && p.GROCERY_PL !== 'N') {
    types.add('produce')
    types.add('canned goods')
  }

  // Fall back to generic if nothing was tagged
  if (types.size === 0) types.add('canned goods')

  return Array.from(types)
}

function buildDescription(p) {
  const programs = []
  if (p.KIDS_CAFE && p.KIDS_CAFE !== 'N') programs.push("Kids' Café")
  if (p.COMMUNITY && p.COMMUNITY !== 'N') programs.push('Community Meals')
  if (p.WEEKEND_BA && p.WEEKEND_BA !== 'N') programs.push('Weekend Backpack')
  if (p.FAMILY_MAR && p.FAMILY_MAR !== 'N') programs.push('Family Market')
  if (p.GROCERY_PL && p.GROCERY_PL !== 'N') programs.push('Grocery Plus')
  if (p.PROGRAM) programs.push(p.PROGRAM)

  return programs.length > 0
    ? `Capital Area Food Bank partner. Programs: ${programs.join(', ')}.`
    : 'Capital Area Food Bank emergency food provider.'
}

/**
 * Normalizes a single DC GIS ArcGIS feature to NourishNet's entity schema.
 * Returns null if the feature lacks valid coordinates.
 */
function normalizeCafbFeature(feature, index) {
  const p = feature.attributes
  const geo = feature.geometry

  const lat = parseFloat(p.LATITUDE || (geo && geo.y))
  const lng = parseFloat(p.LONGITUDE || (geo && geo.x))

  if (!lat || !lng || lat === 0 || lng === 0) return null

  const now = new Date().toISOString()

  return {
    entity_type: 'event',
    name: p.AGENCY_NAM || p.AGENCY_N_1 || 'Food Distribution Site',
    address: [p.ADDRESS, p.CITY, p.STATE, p.ZIPCODE].filter(Boolean).join(', '),
    hours: 'Contact site for hours',
    eligibility: 'Contact site for eligibility requirements',
    food_types: deriveFoodTypes(p),
    languages_served: ['en'],
    contact: 'https://www.capitalareafoodbank.org/find-food-assistance/',
    description: buildDescription(p),
    confidence_score: 0.9,
    source_url: 'https://opendata.dc.gov/datasets/DCGIS::capital-area-food-bank-emergency-food-provider',
    source: 'dcgis',
    extracted_at: now,
    lat,
    lng,
    status: 'active',
    validated_at: now,
    // Internal marker so deduplication or attribution can identify the source
    _cafb_id: `cafb-${index}`,
  }
}

/**
 * Fetches up to 1,000 CAFB partner sites from the DC GIS ArcGIS REST API.
 * Returns an empty array if the request fails (CORS, timeout, network error, etc.)
 * so callers never need to handle errors from this function.
 */
export async function fetchCafbEvents() {
  try {
    const params = new URLSearchParams(CAFB_PARAMS)
    const url = `${CAFB_URL}?${params.toString()}`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)

    if (!res.ok) throw new Error(`DC GIS API responded with ${res.status}`)

    const data = await res.json()
    if (!Array.isArray(data.features)) throw new Error('Unexpected DC GIS response shape')

    return data.features
      .map((f, i) => normalizeCafbFeature(f, i))
      .filter(Boolean)
  } catch (err) {
    console.warn('[NourishNet] DC GIS CAFB fetch failed, continuing without live data:', err.message)
    return []
  }
}
