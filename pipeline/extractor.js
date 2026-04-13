/**
 * extractor.js
 * Strips raw HTML to readable text using @mozilla/readability,
 * then sends to Groq LLM for structured entity extraction.
 * Returns an array of typed entities (event | org | opportunity).
 */

require('dotenv').config();
const Groq = require('groq-sdk');
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');
const crypto = require('crypto');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Max characters sent to Groq — keeps token costs low
const MAX_TEXT_LENGTH = 9000;

/**
 * Use Mozilla Readability to extract the main article/content text
 * from HTML, stripping nav, ads, footers, scripts etc.
 * Falls back to naive tag-stripping if Readability fails.
 */
function extractReadableText(html, url) {
  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (article?.textContent) {
      return article.textContent.replace(/\s+/g, ' ').trim();
    }
  } catch (_) {}

  // Fallback: brute-force strip tags
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * MD5 hash of cleaned text — used to detect content changes
 * between pipeline runs, avoiding redundant re-extraction.
 */
function computeHash(text) {
  return crypto.createHash('md5').update(text).digest('hex');
}

// ─────────────────────────────────────────────
// Groq extraction prompt
// ─────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a structured data extraction assistant for NourishNet, 
a food assistance platform serving Washington DC, Maryland, and Virginia.

Your job is to read text from a webpage and extract all food assistance related entities.

Return ONLY a valid JSON array. No markdown fences, no explanation, no preamble.

Each item in the array must exactly follow this schema:
{
  "entity_type": "event" | "org" | "opportunity",
  "name": "string — name of the event, organization, or opportunity",
  "address": "full street address as a string, or null if not found",
  "hours": "operating hours or event time as a string, or null",
  "eligibility": "who qualifies for this resource, or null",
  "food_types": ["array", "of", "food types offered — e.g. produce, canned goods, hot meals"],
  "languages_served": ["en"],
  "contact": "phone number, email, or website URL, or null",
  "description": "one clear sentence describing this entity, max 40 words",
  "confidence_score": 0.0
}

confidence_score rubric (be honest):
- 0.85 – 1.00 : name + full address + hours all clearly stated
- 0.65 – 0.84 : name + address present, hours vague or missing
- 0.45 – 0.64 : name present, address unclear or missing
- below 0.45  : too little information to be useful

Rules:
- ONLY extract entities in DC, Maryland, or Virginia.
- entity_type = "event" for one-time or recurring distribution events.
- entity_type = "org" for food banks, pantries, or ongoing programs.
- entity_type = "opportunity" for volunteer roles.
- If the page contains nothing relevant, return an empty array: []
- Never invent or guess information not present in the text.`;

/**
 * Extract structured entities from HTML content of a given URL.
 *
 * Returns:
 * {
 *   entities: Array of extracted entity objects,
 *   hash: MD5 of cleaned text (for change detection),
 *   source_url: the URL scraped,
 *   extracted_at: ISO timestamp
 * }
 */
async function extractEntities(html, url) {
  const text = extractReadableText(html, url);
  const hash = computeHash(text);
  const truncated = text.slice(0, MAX_TEXT_LENGTH);

  if (truncated.length < 100) {
    console.log(`    ⚠ Text too short to extract from (${truncated.length} chars)`);
    return { entities: [], hash, source_url: url, extracted_at: new Date().toISOString() };
  }

  console.log(`    Sending ${truncated.length} chars to Groq for extraction...`);

  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Source URL: ${url}\n\n---\n\n${truncated}` }
      ],
      temperature: 0.1,  // Low temp for consistent structured output
      max_tokens: 2000
    });

    const raw = res.choices[0].message.content.trim()
      .replace(/^```json\n?/, '')
      .replace(/^```\n?/, '')
      .replace(/\n?```$/, '')
      .trim();

    let entities = JSON.parse(raw);
    if (!Array.isArray(entities)) entities = [];

    // Attach source metadata to each entity
    entities = entities.map(e => ({
      ...e,
      source_url: url,
      source: 'web',
      extracted_at: new Date().toISOString()
    }));

    console.log(`    ✓ Extracted ${entities.length} entities`);
    return { entities, hash, source_url: url, extracted_at: new Date().toISOString() };

  } catch (err) {
    console.error(`    ✗ Groq extraction failed: ${err.message}`);
    return { entities: [], hash, source_url: url, extracted_at: new Date().toISOString() };
  }
}

/**
 * Extract entities from plain text (used for bot submissions and forwarded messages).
 * Wraps the text in minimal HTML so Readability doesn't choke.
 */
async function extractFromText(text, sourceLabel = 'bot-submission') {
  const html = `<html><body><article>${text}</article></body></html>`;
  return extractEntities(html, sourceLabel);
}

module.exports = { extractEntities, extractFromText };
