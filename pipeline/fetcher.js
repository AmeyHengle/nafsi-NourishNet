/**
 * fetcher.js
 * Fetches HTML from a URL using plain axios first.
 * Falls back to Playwright (headless Chrome) if content is sparse,
 * which handles JavaScript-rendered SPAs.
 */

const axios = require('axios');
const { chromium } = require('playwright');

// If visible text is below this threshold, the page is likely JS-rendered
const MIN_CONTENT_CHARS = 500;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; NourishNetBot/1.0; +https://github.com/AmeyHengle/nafsi-NourishNet)',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5'
};

/**
 * Attempt a plain HTTP GET with axios.
 * Returns raw HTML string or null on failure.
 */
async function fetchWithAxios(url) {
  try {
    const res = await axios.get(url, {
      timeout: 15000,
      headers: HEADERS,
      maxRedirects: 5
    });
    // Only handle HTML responses
    const contentType = res.headers['content-type'] || '';
    if (!contentType.includes('text/html')) return null;
    return res.data;
  } catch (err) {
    console.log(`    axios failed: ${err.message}`);
    return null;
  }
}

/**
 * Fallback: launch headless Chromium, wait for network idle,
 * then return the fully-rendered HTML.
 */
async function fetchWithPlaywright(url) {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  try {
    const context = await browser.newContext({ userAgent: HEADERS['User-Agent'] });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    // Give JS frameworks a moment to finish rendering
    await page.waitForTimeout(1000);
    return await page.content();
  } catch (err) {
    console.log(`    Playwright failed: ${err.message}`);
    return null;
  } finally {
    await browser.close();
  }
}

/**
 * Strip all HTML tags and measure the remaining visible text length.
 * Used to detect sparse/unrendered pages.
 */
function measureVisibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .length;
}

/**
 * Main export — fetch a URL using the best available method.
 *
 * Returns: { html: string, method: 'axios'|'playwright' }
 * or null if both methods fail.
 */
async function fetchUrl(url) {
  console.log(`\n  Fetching: ${url}`);

  // Step 1: Try plain HTTP fetch
  const axiosHtml = await fetchWithAxios(url);
  if (axiosHtml) {
    const textLength = measureVisibleText(axiosHtml);
    if (textLength >= MIN_CONTENT_CHARS) {
      console.log(`    ✓ axios OK (${textLength} chars of text)`);
      return { html: axiosHtml, method: 'axios' };
    }
    console.log(`    ⚠ Only ${textLength} chars — page may be JS-rendered, trying Playwright...`);
  }

  // Step 2: Fallback to Playwright for SPAs / JS-heavy pages
  const pwHtml = await fetchWithPlaywright(url);
  if (pwHtml) {
    const textLength = measureVisibleText(pwHtml);
    console.log(`    ✓ Playwright OK (${textLength} chars of text)`);
    return { html: pwHtml, method: 'playwright' };
  }

  console.log(`    ✗ Both methods failed for: ${url}`);
  return null;
}

module.exports = { fetchUrl };
