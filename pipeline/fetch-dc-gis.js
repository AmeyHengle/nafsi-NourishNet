/**
 * fetch-dc-gis.js
 *
 * Fetches live food distribution data from the DC GIS ArcGIS REST API
 * (Capital Area Food Bank Emergency Food Providers, CC BY 4.0) and
 * merges results into public/data.json using the NourishNet event schema.
 *
 * Usage:
 *   node pipeline/fetch-dc-gis.js
 *
 * Source:
 *   https://opendata.dc.gov/datasets/DCGIS::capital-area-food-bank-emergency-food-provider
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DC_GIS_URL =
  'https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Public_Safety_WebMercator/MapServer/26/query';

const DC_GIS_PARAMS = {
  where: '1=1',
  outFields:
    'AGENCY_NAM,AGENCY_N_1,ADDRESS,CITY,STATE,ZIPCODE,PROGRAM,LATITUDE,LONGITUDE,KIDS_CAFE,COMMUNITY,WEEKEND_BA,FAMILY_MAR,GROCERY_PL',
  f: 'json',
  resultRecordCount: 1000,
  outSR: '4326',
};

const DATA_JSON_PATH = path.resolve(__dirname, '../public/data.json');

/**
 * Maps a raw DC GIS feature to the NourishNet event schema.
 */
function mapFeature(feature) {
  const p = feature.attributes;
  const geo = feature.geometry;

  const lat = parseFloat(p.LATITUDE || (geo && geo.y) || 0);
  const lng = parseFloat(p.LONGITUDE || (geo && geo.x) || 0);

  if (!lat || !lng) return null;

  // Build food_types from program boolean fields
  const foodTypes = [];
  if (p.KIDS_CAFE && p.KIDS_CAFE !== 'N') foodTypes.push("kids' cafe");
  if (p.COMMUNITY && p.COMMUNITY !== 'N') foodTypes.push('community meals');
  if (p.WEEKEND_BA && p.WEEKEND_BA !== 'N') foodTypes.push('weekend backpack');
  if (p.FAMILY_MAR && p.FAMILY_MAR !== 'N') foodTypes.push('family market');
  if (p.GROCERY_PL && p.GROCERY_PL !== 'N') foodTypes.push('grocery plus');
  if (p.PROGRAM) foodTypes.push(p.PROGRAM.toLowerCase());
  if (foodTypes.length === 0) foodTypes.push('emergency food', 'canned goods', 'fresh produce');

  const name = p.AGENCY_NAM || p.AGENCY_N_1 || 'Food Distribution Site';
  const addressParts = [p.ADDRESS, p.CITY, p.STATE, p.ZIPCODE].filter(Boolean);
  const address = addressParts.join(', ');
  const now = new Date().toISOString();

  return {
    entity_type: 'event',
    name,
    address,
    hours: 'Contact for hours',
    eligibility: 'Contact site for eligibility requirements',
    food_types: foodTypes,
    languages_served: ['en'],
    contact: '',
    description: p.PROGRAM ? `Program: ${p.PROGRAM}` : 'Capital Area Food Bank emergency food provider.',
    confidence_score: 0.9,
    source_url: 'https://opendata.dc.gov/datasets/DCGIS::capital-area-food-bank-emergency-food-provider',
    source: 'DC Open Data / Capital Area Food Bank',
    extracted_at: now,
    submitted_via: 'dc-gis-fetch',
    submitted_at: now,
    lat,
    lng,
    status: 'ongoing',
    validated_at: now,
  };
}

/**
 * Returns a dedup key for an event — used to avoid inserting duplicates.
 * Two records are considered the same if they share the same name and address.
 */
function dedupKey(event) {
  return `${event.name}||${event.address}`.toLowerCase();
}

async function main() {
  console.log('Fetching DC GIS data...');

  let features;
  try {
    const res = await axios.get(DC_GIS_URL, {
      params: DC_GIS_PARAMS,
      timeout: 15000,
      headers: { 'User-Agent': 'NourishNetBot/1.0' },
    });

    if (!res.data || !res.data.features) {
      throw new Error('Unexpected response shape — no "features" key');
    }
    features = res.data.features;
    console.log(`  Received ${features.length} raw features from DC GIS`);
  } catch (err) {
    console.error('DC GIS fetch failed:', err.message);
    process.exit(1);
  }

  // Map and drop records without coordinates
  const incoming = features.map(mapFeature).filter(Boolean);
  console.log(`  Mapped ${incoming.length} valid records`);

  // Load existing data.json
  let existing = [];
  if (fs.existsSync(DATA_JSON_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(DATA_JSON_PATH, 'utf8'));
      console.log(`  Loaded ${existing.length} existing records from data.json`);
    } catch {
      console.warn('  Could not parse existing data.json — starting fresh');
    }
  }

  // Dedup: only add records whose name+address isn't already present
  const existingKeys = new Set(existing.map(dedupKey));
  const newRecords = incoming.filter((e) => !existingKeys.has(dedupKey(e)));
  console.log(`  ${newRecords.length} new records to add (${incoming.length - newRecords.length} duplicates skipped)`);

  const merged = [...existing, ...newRecords];
  fs.writeFileSync(DATA_JSON_PATH, JSON.stringify(merged, null, 2));
  console.log(`  Wrote ${merged.length} total records to ${DATA_JSON_PATH}`);
}

main();
