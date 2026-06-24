/**
 * index.js
 * Main entry point for the NourishNet data pipeline.
 *
 * Run order:
 * 1. Load url_directory.json and existing data.json
 * 2. For each URL: fetch → extract → validate
 * 3. Process pending bot submissions from pending_submissions.json
 * 4. Deduplicate all entities (new + existing)
 * 5. Discover new URLs from scraped pages
 * 6. Write final data.json, updated url_directory.json, cleared pending file
 *
 * Triggered by GitHub Actions on a schedule (every 6 hours).
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const { fetchUrl } = require('./fetcher');
const { extractEntities, extractFromText } = require('./extractor');
const { validateAll } = require('./validator');
const { deduplicateEntities } = require('./deduplicator');
const { discoverUrls } = require('./discoverer');

// ── File paths (relative to repo root) ────────────────────────
const PUBLIC_DIR = path.join(__dirname, '../public');
const URL_DIRECTORY_FILE = path.join(PUBLIC_DIR, 'url_directory.json');
const DATA_FILE = path.join(PUBLIC_DIR, 'data.json');
const PENDING_FILE = path.join(PUBLIC_DIR, 'pending_submissions.json');

// ── Helpers ────────────────────────────────────────────────────

function readJson(filePath, fallback = []) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`  Wrote ${filePath}`);
}

// Pause between URL fetches — be polite to web servers
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Main pipeline ──────────────────────────────────────────────

async function run() {
  const startTime = Date.now();
  console.log('═══════════════════════════════════════');
  console.log('  NourishNet Pipeline  —', new Date().toUTCString());
  console.log('═══════════════════════════════════════\n');

  // ── Step 1: Load inputs ──────────────────────────────────────
  const urlDirectory = readJson(URL_DIRECTORY_FILE, []);
  const existingData = readJson(DATA_FILE, []);
  const pendingSubmissions = readJson(PENDING_FILE, []);

  console.log(`Loaded:`);
  console.log(`  ${urlDirectory.length} URLs in directory`);
  console.log(`  ${existingData.length} existing entities in data.json`);
  console.log(`  ${pendingSubmissions.length} pending bot submissions\n`);

  // Track newly discovered URLs to add to directory
  const discoveredUrls = [];

  // Track all freshly extracted (not yet deduplicated) entities
  const freshEntities = [];

  // ── Step 2: Scrape each URL ──────────────────────────────────
  console.log('── SCRAPING URLS ──────────────────────\n');

  for (const entry of urlDirectory) {
    const { url, content_hash: previousHash } = entry;

    console.log(`\n[${urlDirectory.indexOf(entry) + 1}/${urlDirectory.length}] ${url}`);

    // Fetch HTML
    const fetched = await fetchUrl(url);
    if (!fetched) {
      entry.last_visited = new Date().toISOString();
      entry.status = 'failed';
      await sleep(1000);
      continue;
    }

    const { html, method } = fetched;

    // Extract structured entities
    const extracted = await extractEntities(html, url);

    // Skip re-extraction if content hasn't changed since last run
    if (extracted.hash === previousHash) {
      console.log(`    → Content unchanged (hash match), skipping re-extraction`);
      entry.last_visited = new Date().toISOString();
      await sleep(1000);
      continue;
    }

    // Discover new URLs from this page
    const knownUrls = urlDirectory.map(e => e.url);
    const newUrls = await discoverUrls(html, url, knownUrls);
    discoveredUrls.push(...newUrls);

    // Queue entities for validation
    freshEntities.push(...extracted.entities);

    // Update directory entry metadata
    entry.last_visited = new Date().toISOString();
    entry.content_hash = extracted.hash;
    entry.status = 'active';

    await sleep(1500);  // polite crawl delay
  }

  // ── Step 3: Process pending bot submissions ──────────────────
  if (pendingSubmissions.length > 0) {
    console.log(`\n── PROCESSING BOT SUBMISSIONS ─────────\n`);

    for (const submission of pendingSubmissions) {
      console.log(`  Submission: "${submission.name || submission.description || 'unnamed'}"`);

      // Bot submissions are already structured but still need validation + geocoding
      freshEntities.push(submission);
    }

    // Clear the pending queue
    writeJson(PENDING_FILE, []);
  }

  // ── Step 4: Validate all fresh entities ─────────────────────
  console.log(`\n── VALIDATING ${freshEntities.length} ENTITIES ──────────\n`);
  const validatedEntities = await validateAll(freshEntities);
  console.log(`  ${validatedEntities.length} passed validation\n`);

  // ── Step 5: Deduplicate — always preserve curated entries ──────
  console.log(`── DEDUPLICATING ──────────────────────\n`);

  // Mock (seed/demo) and community (Telegram bot) entries are never re-scraped.
  // They must survive every pipeline run unconditionally.
  const curatedEntries = existingData.filter(
    e => e.source === 'mock' || e.source === 'community'
  );
  const curatedNames = new Set(curatedEntries.map(e => e.name.toLowerCase().trim()));

  // Deduplicate only freshly scraped web entries against prior web entries
  const priorWebEntries = existingData.filter(e => e.source === 'web');
  const deduplicatedWeb = deduplicateEntities(validatedEntities, priorWebEntries);

  // Drop any web entry whose name matches a curated entry to avoid shadowing
  const filteredWeb = deduplicatedWeb.filter(
    e => !curatedNames.has(e.name.toLowerCase().trim())
  );

  const finalEntities = [...filteredWeb, ...curatedEntries];

  console.log(`  ${filteredWeb.length} web entities after deduplication`);
  console.log(`  ${curatedEntries.length} curated entries preserved (mock + community)`);
  console.log(`  ${finalEntities.length} total\n`);

  // ── Step 6: Update URL directory with discoveries ────────────
  const allKnownUrls = new Set(urlDirectory.map(e => e.url));
  const trulyNew = discoveredUrls.filter(e => !allKnownUrls.has(e.url));
  const updatedDirectory = [...urlDirectory, ...trulyNew];
  console.log(`\n  Added ${trulyNew.length} new URLs to directory (total: ${updatedDirectory.length})`);

  // ── Step 7: Write outputs ────────────────────────────────────
  console.log('\n── WRITING OUTPUTS ────────────────────\n');
  writeJson(DATA_FILE, finalEntities);
  writeJson(URL_DIRECTORY_FILE, updatedDirectory);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n═══════════════════════════════════════`);
  console.log(`  Done in ${elapsed}s`);
  console.log(`  ${finalEntities.length} total entities in data.json`);
  console.log(`  ${finalEntities.filter(e => e.entity_type === 'event').length} events`);
  console.log(`  ${finalEntities.filter(e => e.entity_type === 'org').length} organizations`);
  console.log(`  ${finalEntities.filter(e => e.entity_type === 'opportunity').length} volunteer opportunities`);
  console.log(`═══════════════════════════════════════\n`);
}

run().catch(err => {
  console.error('\n✗ Pipeline failed:', err);
  process.exit(1);
});