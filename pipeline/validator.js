/**
 * validator.js
 * Validates extracted entities:
 * 1. Filters by confidence score
 * 2. Parses and checks event dates for staleness
 * 3. Geocodes addresses using Nominatim (free, no API key needed)
 * 4. Assigns a final status: active | expired | unverified
 */

const axios = require('axios');

// Nominatim rate limit: 1 request per second (required by their ToS)
const NOMINATIM_DELAY_MS = 1100;
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';

// Entities below this score are dropped entirely
const MIN_CONFIDENCE = 0.45;

// Entities between MIN and this score are kept but flagged as unverified
const UNVERIFIED_THRESHOLD = 0.65;

// ─────────────────────────────────────────────
// Geocoding
// ─────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Geocode an address string using Nominatim (OpenStreetMap).
 * Returns { lat, lng } or null if not found.
 * Respects the 1 req/sec rate limit with a built-in delay.
 */
async function geocode(address) {
  if (!address) return null;

  await sleep(NOMINATIM_DELAY_MS);

  try {
    const res = await axios.get(NOMINATIM_BASE, {
      params: {
        q: address,
        format: 'json',
        limit: 1,
        countrycodes: 'us',
        viewbox: '-77.5,38.7,-76.8,39.1',  // DC/MD bounding box
        bounded: 0
      },
      headers: {
        'User-Agent': 'NourishNetBot/1.0 (nafsi-NourishNet hackathon project)'
      },
      timeout: 8000
    });

    if (res.data && res.data.length > 0) {
      const { lat, lon } = res.data[0];
      return { lat: parseFloat(lat), lng: parseFloat(lon) };
    }
    return null;
  } catch (err) {
    console.log(`    Geocoding failed for "${address}": ${err.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────
// Staleness detection
// ─────────────────────────────────────────────

// Keywords that suggest a definitive past date in the hours string
const MONTH_NAMES = [
  'january','february','march','april','may','june',
  'july','august','september','october','november','december',
  'jan','feb','mar','apr','jun','jul','aug','sep','oct','nov','dec'
];

/**
 * Try to parse a date from a free-text hours/date string.
 * Returns a Date object if a specific date can be found, otherwise null.
 * Ongoing/recurring schedules (e.g. "every Saturday") return null.
 */
function parseEventDate(hoursString) {
  if (!hoursString) return null;
  const lower = hoursString.toLowerCase();

  // Recurring / ongoing patterns — not stale
  const recurringPatterns = ['every', 'weekly', 'monthly', 'daily', 'mondays',
    'tuesdays', 'wednesdays', 'thursdays', 'fridays', 'saturdays', 'sundays',
    'ongoing', 'year-round', 'open'];
  if (recurringPatterns.some(p => lower.includes(p))) return null;

  // Try native Date parsing — works for "April 18, 2026", "2026-04-18" etc.
  const parsed = new Date(hoursString);
  if (!isNaN(parsed.getTime())) return parsed;

  // Try extracting month + day pattern like "April 18" or "Apr 18"
  const monthMatch = MONTH_NAMES.find(m => lower.includes(m));
  if (monthMatch) {
    const dayMatch = hoursString.match(/\b(\d{1,2})\b/);
    if (dayMatch) {
      const year = new Date().getFullYear();
      const attempt = new Date(`${monthMatch} ${dayMatch[1]} ${year}`);
      if (!isNaN(attempt.getTime())) return attempt;
    }
  }

  return null;
}

/**
 * Check whether an event's date has passed.
 * Returns 'expired' | 'active' | 'ongoing' (for recurring/undated)
 */
function checkStaleness(entity) {
  if (entity.entity_type !== 'event') return 'active';  // orgs/opportunities don't expire

  const date = parseEventDate(entity.hours);
  if (!date) return 'ongoing';  // no specific date → treat as ongoing

  const now = new Date();
  // Give a 1-day grace period for same-day events
  const dayAfter = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  return dayAfter < now ? 'expired' : 'active';
}

// ─────────────────────────────────────────────
// Main validator
// ─────────────────────────────────────────────

/**
 * Validate and enrich a single extracted entity.
 *
 * Returns the enriched entity, or null if it should be dropped.
 */
async function validateEntity(entity) {
  // 1. Confidence gate — drop low-confidence entities entirely
  if ((entity.confidence_score ?? 0) < MIN_CONFIDENCE) {
    console.log(`    ✗ Dropped (confidence ${entity.confidence_score}): ${entity.name}`);
    return null;
  }

  // 2. Must have a name at minimum
  if (!entity.name || entity.name.trim().length < 2) {
    console.log(`    ✗ Dropped (no name)`);
    return null;
  }

  // 3. Staleness check
  const stalenessStatus = checkStaleness(entity);
  if (stalenessStatus === 'expired') {
    console.log(`    ✗ Dropped (expired event): ${entity.name}`);
    return null;
  }

  // 4. Geocode if address is present and lat/lng not already set
  let coords = entity.lat && entity.lng
    ? { lat: entity.lat, lng: entity.lng }
    : await geocode(entity.address);

  // 5. Drop events and orgs without any location data — they're not useful for the map
  if (!coords && entity.entity_type !== 'opportunity') {
    console.log(`    ⚠ No coordinates for: ${entity.name} — keeping with unverified flag`);
  }

  // 6. Set final status
  const status =
    stalenessStatus === 'ongoing' ? 'ongoing' :
    (entity.confidence_score ?? 0) < UNVERIFIED_THRESHOLD ? 'unverified' :
    'active';

  const enriched = {
    ...entity,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    status,
    validated_at: new Date().toISOString()
  };

  console.log(`    ✓ Validated [${status}]: ${entity.name}`);
  return enriched;
}

/**
 * Validate an array of entities, geocoding each one.
 * Returns only the valid, enriched entities.
 */
async function validateAll(entities) {
  const results = [];
  for (const entity of entities) {
    const validated = await validateEntity(entity);
    if (validated) results.push(validated);
  }
  return results;
}

module.exports = { validateAll, validateEntity, geocode };
