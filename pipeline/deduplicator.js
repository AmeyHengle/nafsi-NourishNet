/**
 * deduplicator.js
 * Prevents the same food bank / event from appearing multiple times
 * when it's listed across several different websites.
 *
 * Strategy:
 * 1. Fuzzy name matching using Fuse.js (catches typos, abbreviations)
 * 2. Geographic proximity check (< 150 metres = likely the same place)
 * 3. Merge duplicates, keeping the most complete field values
 */

const Fuse = require('fuse.js');

// How similar two names must be to be considered a match (0–1, lower = stricter)
const FUSE_THRESHOLD = 0.35;

// Max distance in metres for two entities to be considered co-located
const MAX_DISTANCE_METRES = 150;

// ─────────────────────────────────────────────
// Haversine distance
// ─────────────────────────────────────────────

/**
 * Compute distance in metres between two lat/lng coordinate pairs.
 */
function haversineMetres(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in metres
  const toRad = x => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─────────────────────────────────────────────
// Merge helpers
// ─────────────────────────────────────────────

/**
 * Pick the best (non-null, longer) value between two candidates.
 * For arrays, merge and deduplicate.
 */
function pickBest(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    return [...new Set([...a, ...b])];
  }
  if (a && !b) return a;
  if (b && !a) return b;
  if (typeof a === 'string' && typeof b === 'string') {
    return a.length >= b.length ? a : b;
  }
  return a ?? b;
}

/**
 * Merge two entity records into one, keeping the most complete fields.
 * The entity with the higher confidence_score is used as the base.
 */
function mergeEntities(a, b) {
  const [primary, secondary] = (a.confidence_score ?? 0) >= (b.confidence_score ?? 0)
    ? [a, b]
    : [b, a];

  return {
    ...primary,
    name: pickBest(primary.name, secondary.name),
    address: pickBest(primary.address, secondary.address),
    hours: pickBest(primary.hours, secondary.hours),
    eligibility: pickBest(primary.eligibility, secondary.eligibility),
    food_types: pickBest(primary.food_types ?? [], secondary.food_types ?? []),
    languages_served: pickBest(primary.languages_served ?? ['en'], secondary.languages_served ?? ['en']),
    contact: pickBest(primary.contact, secondary.contact),
    description: pickBest(primary.description, secondary.description),
    lat: primary.lat ?? secondary.lat,
    lng: primary.lng ?? secondary.lng,
    // Track all source URLs this entity was found at
    source_urls: [...new Set([
      ...(primary.source_urls ?? [primary.source_url].filter(Boolean)),
      ...(secondary.source_urls ?? [secondary.source_url].filter(Boolean))
    ])],
    confidence_score: Math.max(primary.confidence_score ?? 0, secondary.confidence_score ?? 0),
    merged: true
  };
}

// ─────────────────────────────────────────────
// Main deduplication logic
// ─────────────────────────────────────────────

/**
 * Deduplicate a list of validated entities.
 *
 * Groups entities of the same type, then checks each pair for:
 * - Fuzzy name similarity above threshold, AND/OR
 * - Geographic proximity under MAX_DISTANCE_METRES (if both have coordinates)
 *
 * Merges duplicates into a single canonical record.
 *
 * @param {Array} newEntities  - freshly validated entities from this pipeline run
 * @param {Array} existingData - current contents of data.json
 * @returns {Array} merged, deduplicated entity list
 */
function deduplicateEntities(newEntities, existingData = []) {
  const allEntities = [...existingData, ...newEntities];

  // Process each entity_type independently
  const types = ['event', 'org', 'opportunity'];
  const finalEntities = [];

  for (const type of types) {
    const group = allEntities.filter(e => e.entity_type === type);
    const merged = clusterAndMerge(group);
    finalEntities.push(...merged);
  }

  console.log(`\n  Deduplication: ${allEntities.length} total → ${finalEntities.length} after merge`);
  return finalEntities;
}

/**
 * Given a flat list of entities of the same type,
 * find duplicates and collapse them.
 */
function clusterAndMerge(entities) {
  if (entities.length === 0) return [];

  // Set up fuzzy search on name field
  const fuse = new Fuse(entities, {
    keys: ['name'],
    threshold: FUSE_THRESHOLD,
    includeScore: true,
    minMatchCharLength: 4
  });

  const visited = new Set();
  const result = [];

  for (let i = 0; i < entities.length; i++) {
    if (visited.has(i)) continue;

    let canonical = entities[i];
    visited.add(i);

    // Find fuzzy name matches for this entity
    const matches = fuse.search(canonical.name);

    for (const match of matches) {
      const j = entities.indexOf(match.item);
      if (j === i || visited.has(j)) continue;

      const candidate = entities[j];

      // Check if they also share a location (tighter gate)
      const bothHaveCoords =
        canonical.lat && canonical.lng && candidate.lat && candidate.lng;

      const isSameLocation = bothHaveCoords &&
        haversineMetres(canonical.lat, canonical.lng, candidate.lat, candidate.lng)
          < MAX_DISTANCE_METRES;

      // Name alone is enough for a confident fuzzy match
      // Location agreement makes it a near-certain duplicate
      const isDuplicate = isSameLocation || (match.score ?? 1) < 0.2;

      if (isDuplicate) {
        console.log(`    Merging: "${canonical.name}" ← "${candidate.name}"`);
        canonical = mergeEntities(canonical, candidate);
        visited.add(j);
      }
    }

    result.push(canonical);
  }

  return result;
}

module.exports = { deduplicateEntities };
