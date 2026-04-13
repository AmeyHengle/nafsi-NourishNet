/**
 * discoverer.js
 * Grows the URL directory automatically over time.
 *
 * After each page is scraped, this module:
 * 1. Extracts all outbound hyperlinks from the HTML
 * 2. Filters by geographic + food-assistance keyword signals
 * 3. Scores remaining candidates using Groq
 * 4. Returns new URLs worth adding to url_directory.json
 */

require('dotenv').config();
const Groq = require('groq-sdk');
const { JSDOM } = require('jsdom');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Don't crawl more than this many new URLs per pipeline run (cost + time control)
const MAX_NEW_URLS_PER_RUN = 10;

// Minimum Groq relevance score for a URL to be added to the directory
const MIN_RELEVANCE_SCORE = 0.65;

// Max crawl depth — only follow links from pages we directly scraped
const MAX_DEPTH = 2;

// ─────────────────────────────────────────────
// Keyword filters (cheap pre-screen before calling Groq)
// ─────────────────────────────────────────────

const FOOD_KEYWORDS = [
  'food', 'pantry', 'hunger', 'meal', 'nutrition', 'grocery',
  'distribute', 'distribution', 'bank', 'nourish', 'feed',
  'assistance', 'resource', 'community fridge', 'soup kitchen'
];

const GEO_KEYWORDS = [
  'dc', 'washington', 'maryland', 'virginia', 'md', 'va',
  'montgomery', 'prince george', 'arlington', 'alexandria',
  'fairfax', 'loudoun', 'bethesda', 'silver spring', 'hyattsville',
  'rockville', 'annapolis', 'bowie', 'laurel', 'college park'
];

// Domains to skip — not useful sources
const SKIP_DOMAINS = [
  'facebook.com', 'twitter.com', 'x.com', 'instagram.com',
  'youtube.com', 'linkedin.com', 'google.com', 'apple.com',
  'amazon.com', 'wikipedia.org', 'yelp.com', 'tiktok.com'
];

/**
 * Quick keyword-based pre-filter.
 * Returns true if the URL or visible link text looks food/geo relevant.
 */
function passesKeywordFilter(url, linkText = '') {
  const combined = (url + ' ' + linkText).toLowerCase();

  if (SKIP_DOMAINS.some(d => combined.includes(d))) return false;

  const hasFood = FOOD_KEYWORDS.some(k => combined.includes(k));
  const hasGeo = GEO_KEYWORDS.some(k => combined.includes(k));

  // Require at least one food keyword (geo alone is too broad)
  return hasFood;
}

// ─────────────────────────────────────────────
// Link extraction
// ─────────────────────────────────────────────

/**
 * Extract all absolute hrefs from HTML, along with their anchor text.
 */
function extractLinks(html, baseUrl) {
  const links = [];
  try {
    const dom = new JSDOM(html, { url: baseUrl });
    const anchors = dom.window.document.querySelectorAll('a[href]');
    const base = new URL(baseUrl);

    for (const a of anchors) {
      try {
        const absolute = new URL(a.href, baseUrl).toString();
        // Only follow http/https links
        if (!absolute.startsWith('http')) continue;
        // Don't re-crawl same-origin unless path is different
        const linkUrl = new URL(absolute);
        if (linkUrl.hostname === base.hostname && linkUrl.pathname === base.pathname) continue;

        links.push({
          url: absolute.split('#')[0],  // strip fragment
          text: (a.textContent || '').trim().slice(0, 100)
        });
      } catch (_) {}
    }
  } catch (_) {}

  // Deduplicate by URL
  const seen = new Set();
  return links.filter(l => {
    if (seen.has(l.url)) return false;
    seen.add(l.url);
    return true;
  });
}

// ─────────────────────────────────────────────
// Groq relevance scoring
// ─────────────────────────────────────────────

const SCORE_PROMPT = `You are evaluating URLs to determine if they likely contain information about 
food assistance programs in the Washington DC, Maryland, or Virginia area.

Score each URL from 0.0 to 1.0:
- 1.0: Almost certainly a food bank, pantry, food distribution event, or food assistance resource page
- 0.7: Probably relevant (community org, nonprofit, government resource)
- 0.4: Possibly relevant but unclear
- 0.0: Irrelevant (social media, news, commercial, unrelated nonprofit)

Return ONLY a JSON array in this format, one entry per URL provided:
[{ "url": "...", "score": 0.0, "reason": "one phrase" }]`;

/**
 * Score a batch of candidate URLs using Groq.
 * Returns array of { url, score, reason }.
 */
async function scoreUrls(candidates) {
  if (candidates.length === 0) return [];

  // Batch up to 20 URLs per Groq call to save tokens
  const batch = candidates.slice(0, 20);
  const urlList = batch.map((c, i) => `${i + 1}. ${c.url} — "${c.text}"`).join('\n');

  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SCORE_PROMPT },
        { role: 'user', content: urlList }
      ],
      temperature: 0.1,
      max_tokens: 800
    });

    const raw = res.choices[0].message.content.trim()
      .replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const scored = JSON.parse(raw);
    return Array.isArray(scored) ? scored : [];
  } catch (err) {
    console.log(`    URL scoring failed: ${err.message}`);
    return [];
  }
}

// ─────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────

/**
 * Discover new URLs from a scraped page's HTML.
 *
 * @param {string} html          - raw HTML of the page
 * @param {string} sourceUrl     - URL the HTML was fetched from
 * @param {string[]} knownUrls   - already-tracked URLs (to avoid re-adding)
 * @param {number} currentDepth  - crawl depth (stops at MAX_DEPTH)
 *
 * Returns array of new URL directory entries to add.
 */
async function discoverUrls(html, sourceUrl, knownUrls = [], currentDepth = 1) {
  if (currentDepth > MAX_DEPTH) return [];

  const knownSet = new Set(knownUrls);
  const links = extractLinks(html, sourceUrl);

  // Pre-filter with cheap keyword check
  const candidates = links.filter(
    l => !knownSet.has(l.url) && passesKeywordFilter(l.url, l.text)
  );

  if (candidates.length === 0) {
    console.log(`    No new URL candidates found on ${sourceUrl}`);
    return [];
  }

  console.log(`    ${candidates.length} URL candidates to score from ${sourceUrl}`);

  // Score with Groq
  const scored = await scoreUrls(candidates);
  const highQuality = scored
    .filter(s => s.score >= MIN_RELEVANCE_SCORE)
    .slice(0, MAX_NEW_URLS_PER_RUN);

  // Format as url_directory entries
  const newEntries = highQuality.map(s => ({
    url: s.url,
    label: s.reason || 'Auto-discovered',
    status: 'discovered',
    discovered_from: sourceUrl,
    discovered_at: new Date().toISOString(),
    last_visited: null,
    content_hash: null
  }));

  if (newEntries.length > 0) {
    console.log(`    ✓ ${newEntries.length} new URLs added to directory`);
    newEntries.forEach(e => console.log(`      + ${e.url}`));
  }

  return newEntries;
}

module.exports = { discoverUrls };
