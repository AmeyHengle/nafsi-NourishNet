/**
 * bot-poll.js
 * Polls the Telegram Bot API for new messages. No persistent server needed —
 * runs via GitHub Actions on a schedule (every 15 minutes).
 *
 * Handles TWO distinct message sources:
 *
 * 1. DIRECT MESSAGES (private chat)
 *    Organizer intentionally submits an event to the bot.
 *    Flow: extract → confirm with YES/NO/EDIT → add to pending_submissions.json
 *
 * 2. GROUP MESSAGES (group / supergroup)
 *    Bot is added to a Telegram group and silently monitors all messages.
 *    Flow: keyword filter → hash dedup → Groq extract → entity dedup →
 *          silent queue → react with 👍
 *    The bot NEVER sends text replies into groups.
 *
 * Prerequisites for group monitoring:
 *    In BotFather → /mybots → your bot → Bot Settings → Group Privacy → Turn Off
 *    This allows the bot to see all group messages, not just /commands.
 *
 * State files (all in public/ so GitHub Actions can commit them):
 *    bot_state.json         — last processed update_id
 *    bot_conversations.json — in-progress DM confirmation flows
 *    bot_seen_hashes.json   — rolling set of group message hashes (dedup layer 1)
 *    pending_submissions.json — queue for main pipeline to process
 */

require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { extractFromText } = require('./extractor');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = `https://api.telegram.org/bot${TOKEN}`;

// ── State file paths ────────────────────────────────────────────
const PUBLIC = path.join(__dirname, '../public');
const STATE_FILE        = path.join(PUBLIC, 'bot_state.json');
const CONVERSATIONS_FILE = path.join(PUBLIC, 'bot_conversations.json');
const SUBMISSIONS_FILE  = path.join(PUBLIC, 'pending_submissions.json');
const HASHES_FILE       = path.join(PUBLIC, 'bot_seen_hashes.json');

// ── Tuning constants ────────────────────────────────────────────
const DM_RATE_LIMIT         = 3;    // max DM submissions per user per day
const GROUP_CONFIDENCE_MIN  = 0.65; // lower than DM since pipeline validator is still a quality gate
const GROUP_MIN_TEXT_LENGTH = 40;   // ignore very short group messages
const HASH_ROLLING_MAX      = 500;  // max hashes to keep in seen-hashes file
const HASH_PRUNE_TO         = 400;  // prune back to this many when limit hit
const SENDER_DEDUP_HOURS    = 24;   // ignore same sender + similar entity within N hours

// Keywords that suggest a message might be food-related
// (cheap pre-filter before calling Groq)
const FOOD_KEYWORDS = [
  'food', 'pantry', 'hunger', 'meal', 'nutrition', 'grocery', 'groceries',
  'distribute', 'distribution', 'giveaway', 'give away', 'free food',
  'food bank', 'soup kitchen', 'community fridge', 'feed', 'feeding',
  'donate', 'donation', 'volunteer', 'volunteering', 'nourish',
  'canned', 'produce', 'bread', 'rice', 'beans'
]

// ─────────────────────────────────────────────────────────────────
// File helpers
// ─────────────────────────────────────────────────────────────────

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ─────────────────────────────────────────────────────────────────
// Telegram API helpers
// ─────────────────────────────────────────────────────────────────

async function getUpdates(offset) {
  const res = await axios.get(`${BASE_URL}/getUpdates`, {
    params: { offset, timeout: 10, limit: 100 },
    timeout: 15000
  });
  return res.data.result || [];
}

async function sendMessage(chatId, text, options = {}) {
  await axios.post(`${BASE_URL}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    ...options
  });
}

/**
 * React to a group message with a 👍 emoji.
 * Silent acknowledgement — doesn't clutter the group chat with text.
 * Fails silently if the group type doesn't support reactions.
 */
async function reactThumbsUp(chatId, messageId) {
  try {
    await axios.post(`${BASE_URL}/setMessageReaction`, {
      chat_id: chatId,
      message_id: messageId,
      reaction: [{ type: 'emoji', emoji: '👍' }],
      is_big: false
    });
  } catch {
    // Reactions not supported on all group types — silent fallback is correct
  }
}

// ─────────────────────────────────────────────────────────────────
// Deduplication helpers
// ─────────────────────────────────────────────────────────────────

/**
 * MD5 hash of normalized text — used as a fast exact-duplicate check.
 * Normalising (lowercase, collapse whitespace) catches copy-paste
 * of the same message with minor formatting differences.
 */
function textHash(text) {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  return crypto.createHash('md5').update(normalized).digest('hex');
}

/**
 * Check whether we've already seen this exact message text.
 * Updates the rolling hash list in place.
 */
function isHashSeen(hash, seenHashes) {
  if (seenHashes.hashes.includes(hash)) return true;

  // Add hash, prune if over limit
  seenHashes.hashes.push(hash);
  if (seenHashes.hashes.length > HASH_ROLLING_MAX) {
    seenHashes.hashes = seenHashes.hashes.slice(-HASH_PRUNE_TO);
  }
  return false;
}

/**
 * Lightweight fuzzy name match — returns 0 (no match) to 1 (identical).
 * Uses character overlap ratio rather than a full Levenshtein to avoid
 * importing an extra library inside the bot module.
 */
function nameSimilarity(a = '', b = '') {
  const sa = new Set(a.toLowerCase().split(/\s+/));
  const sb = new Set(b.toLowerCase().split(/\s+/));
  const intersection = [...sa].filter(w => sb.has(w)).length;
  return intersection / Math.max(sa.size, sb.size, 1);
}

/**
 * Layer 3 dedup: same Telegram user submitted a very similar entity
 * within the last SENDER_DEDUP_HOURS hours.
 * Catches the case where an organizer posts in the group AND DMs the bot.
 */
function isSenderDuplicate(entity, telegramUserId, submissions) {
  if (!telegramUserId) return false;
  const cutoff = Date.now() - SENDER_DEDUP_HOURS * 60 * 60 * 1000;

  return submissions.some(s => {
    if (String(s.telegram_user_id) !== String(telegramUserId)) return false;
    if (Date.parse(s.submitted_at) < cutoff) return false;

    const sameName    = nameSimilarity(s.name, entity.name) > 0.7;
    const sameAddress = s.address && entity.address &&
                        s.address.toLowerCase() === entity.address.toLowerCase();
    return sameName || sameAddress;
  });
}

// ─────────────────────────────────────────────────────────────────
// Keyword pre-filter
// ─────────────────────────────────────────────────────────────────

function passesKeywordFilter(text) {
  const lower = text.toLowerCase();
  return FOOD_KEYWORDS.some(k => lower.includes(k));
}

// ─────────────────────────────────────────────────────────────────
// Message formatting (DM flow only)
// ─────────────────────────────────────────────────────────────────

function formatEntitySummary(entity) {
  return [
    `<b>📋 Here's what I extracted:</b>\n`,
    `<b>Name:</b> ${entity.name || '—'}`,
    `<b>Type:</b> ${entity.entity_type || '—'}`,
    `<b>Address:</b> ${entity.address || '—'}`,
    `<b>Hours:</b> ${entity.hours || '—'}`,
    `<b>Eligibility:</b> ${entity.eligibility || 'Not specified'}`,
    `<b>Food types:</b> ${(entity.food_types || []).join(', ') || '—'}`,
    `<b>Contact:</b> ${entity.contact || '—'}`,
    `<b>Description:</b> ${entity.description || '—'}`,
    `\n<b>Confidence:</b> ${Math.round((entity.confidence_score || 0) * 100)}%`,
    `\n✅ Reply <b>YES</b> to submit`,
    `❌ Reply <b>NO</b> to cancel`,
    `✏️ Reply <b>EDIT address 123 Main St</b> to correct a field`
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────────
// GROUP MESSAGE HANDLER
// ─────────────────────────────────────────────────────────────────

/**
 * Silently process a message from a Telegram group or supergroup.
 * The bot NEVER interacts with the group in any way — no replies,
 * no reactions, no acknowledgements. It only reads and queues.
 *
 * Decision tree:
 *   1. Text too short?              → skip silently
 *   2. No food keywords?            → skip silently (saves Groq tokens)
 *   3. Hash already seen?           → skip silently (exact duplicate)
 *   4. Groq extracts nothing?       → skip silently
 *   5. Confidence < threshold?      → skip silently
 *   6. Sender dedup match?          → skip silently
 *   7. All checks pass              → queue to pending_submissions.json (silent)
 */
async function handleGroupMessage(msg, seenHashes, submissions) {
  // Accept text messages and photo captions (flyers)
  const text = (msg.text || msg.caption || '').trim();
  const groupName = msg.chat.title || 'unknown group';
  const groupId   = msg.chat.id;
  const userId    = msg.from?.id;

  // 1. Too short
  if (text.length < GROUP_MIN_TEXT_LENGTH) return;

  // 2. Keyword pre-filter
  if (!passesKeywordFilter(text)) return;

  // 3. Hash dedup (exact / near-exact duplicates)
  const hash = textHash(text);
  if (isHashSeen(hash, seenHashes)) {
    console.log(`    [group:${groupName}] Duplicate hash — skipped`);
    return;
  }

  console.log(`    [group:${groupName}] Relevant message found — extracting...`);

  // 4. Groq extraction
  const result = await extractFromText(text);
  if (!result.entities || result.entities.length === 0) {
    console.log(`    [group:${groupName}] No entities extracted — skipped`);
    return;
  }

  // Take highest-confidence entity from this message
  const entity = result.entities.sort(
    (a, b) => (b.confidence_score || 0) - (a.confidence_score || 0)
  )[0];

  // 5. Confidence gate
  if ((entity.confidence_score || 0) < GROUP_CONFIDENCE_MIN) {
    console.log(`    [group:${groupName}] Low confidence (${entity.confidence_score}) — skipped`);
    return;
  }

  // 6. Sender dedup — same user, similar entity, within 24h
  if (isSenderDuplicate(entity, userId, submissions)) {
    console.log(`    [group:${groupName}] Sender duplicate — skipped`);
    return;
  }

  // 7. All clear — queue the submission
  submissions.push({
    ...entity,
    source: 'community',
    submitted_via: 'telegram_group',
    telegram_group_id: groupId,
    telegram_group_name: groupName,
    telegram_user_id: userId,
    original_message: text,
    submitted_at: new Date().toISOString()
  });

  console.log(`    ✓ [group:${groupName}] Queued: "${entity.name}" (confidence: ${entity.confidence_score})`);
  // No reaction, no reply — the group sees nothing. The bot is invisible.
}

// ─────────────────────────────────────────────────────────────────
// DIRECT MESSAGE HANDLERS
// ─────────────────────────────────────────────────────────────────

async function handleNewSubmission(chatId, text, conversations) {
  await sendMessage(chatId, '🔍 Got it! Analyzing your message, one moment...');

  const result = await extractFromText(text);

  if (!result.entities || result.entities.length === 0) {
    await sendMessage(chatId,
      `❓ I couldn't extract any food event details from that message.\n\n` +
      `Please try including:\n` +
      `• Event name\n• Address or location\n• Date and time\n• Who it's for\n\n` +
      `Example: <i>"Free groceries at MLK Library, 901 G St NW DC, ` +
      `this Saturday April 19 from 10am to 2pm. No ID required."</i>`
    );
    return;
  }

  const entity = result.entities.sort(
    (a, b) => (b.confidence_score || 0) - (a.confidence_score || 0)
  )[0];

  conversations[chatId] = {
    state: 'awaiting_confirmation',
    entity,
    original_text: text,
    started_at: new Date().toISOString()
  };

  await sendMessage(chatId, formatEntitySummary(entity));
}

async function handleConfirmationReply(chatId, text, conversations, submissions) {
  const convo = conversations[chatId];
  if (!convo) return;

  const upper = text.trim().toUpperCase();

  // ── YES ──────────────────────────────────────
  if (upper === 'YES') {
    submissions.push({
      ...convo.entity,
      source: 'community',
      submitted_via: 'telegram_dm',
      original_message: convo.original_text,
      submitted_at: new Date().toISOString()
    });

    delete conversations[chatId];

    await sendMessage(chatId,
      `✅ <b>Submitted!</b> Your event will appear on NourishNet within 6 hours.\n\n` +
      `Thank you for helping your community! 🥗\n\n` +
      `Send another message any time to add more events.`
    );
    return;
  }

  // ── NO ───────────────────────────────────────
  if (upper === 'NO' || upper === 'CANCEL') {
    delete conversations[chatId];
    await sendMessage(chatId, `❌ Submission cancelled. Send a new message whenever you're ready.`);
    return;
  }

  // ── EDIT <field> <value> ──────────────────────
  if (upper.startsWith('EDIT ')) {
    const parts = text.trim().split(' ');
    if (parts.length < 3) {
      await sendMessage(chatId,
        `✏️ Format: <b>EDIT fieldname new value</b>\n` +
        `Example: <code>EDIT address 901 G St NW, Washington DC</code>\n\n` +
        `Editable fields: name, address, hours, eligibility, contact, description`
      );
      return;
    }

    const field = parts[1].toLowerCase();
    const value = parts.slice(2).join(' ');
    const editableFields = ['name', 'address', 'hours', 'eligibility', 'contact', 'description'];

    if (!editableFields.includes(field)) {
      await sendMessage(chatId,
        `❓ Unknown field "<b>${field}</b>". Editable: ${editableFields.join(', ')}`
      );
      return;
    }

    convo.entity[field] = value;
    conversations[chatId] = convo;
    await sendMessage(chatId,
      `✏️ Updated <b>${field}</b>. Revised summary:\n\n` + formatEntitySummary(convo.entity)
    );
    return;
  }

  // ── Unrecognised ──────────────────────────────
  await sendMessage(chatId,
    `Please reply with:\n• <b>YES</b> — submit\n• <b>NO</b> — cancel\n• <b>EDIT address 123 Main St</b> — correct a field`
  );
}

// ─────────────────────────────────────────────────────────────────
// DM rate limiting
// ─────────────────────────────────────────────────────────────────

function isDmRateLimited(chatId, submissions) {
  const today = new Date().toISOString().slice(0, 10);
  const count = submissions.filter(
    s => s.submitted_via === 'telegram_dm' &&
         String(s.telegram_user_id) === String(chatId) &&
         (s.submitted_at || '').startsWith(today)
  ).length;
  return count >= DM_RATE_LIMIT;
}

// ─────────────────────────────────────────────────────────────────
// Main polling entry point
// ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('🤖 NourishNet Telegram bot polling started...\n');

  if (!TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not set. Exiting.');
    process.exit(1);
  }

  // Load all state files
  const state         = readJson(STATE_FILE,         { last_update_id: 0 });
  const conversations = readJson(CONVERSATIONS_FILE,  {});
  const submissions   = readJson(SUBMISSIONS_FILE,    []);
  const seenHashes    = readJson(HASHES_FILE,         { hashes: [] });

  let offset = (state.last_update_id || 0) + 1;
  const updates = await getUpdates(offset);

  console.log(`  Found ${updates.length} new update(s)\n`);

  let dmCount    = 0;
  let groupCount = 0;
  let queuedCount = 0;

  for (const update of updates) {
    const msg = update.message;

    // Only process text messages and photo captions for now
    if (!msg || (!msg.text && !msg.caption)) {
      offset = Math.max(offset, update.update_id + 1);
      continue;
    }

    const chatType = msg.chat.type; // 'private' | 'group' | 'supergroup' | 'channel'
    const chatId   = String(msg.chat.id);
    const text     = (msg.text || msg.caption || '').trim();

    try {

      if (chatType === 'group' || chatType === 'supergroup') {
        // ── Group monitoring — SILENT, no text replies ever ──────────
        // Parse the message. If relevant: queue it + react 👍.
        // If not relevant: ignore completely. No text sent to the group.
        groupCount++;
        const prevLen = submissions.length;
        await handleGroupMessage(msg, seenHashes, submissions);
        if (submissions.length > prevLen) queuedCount++;

      } else if (chatType === 'private') {
        // ── Direct message — interactive confirmation flow ────────────
        dmCount++;
        console.log(`  [DM] from ${chatId}: "${text.slice(0, 60)}"`);

        const inConversation = !!conversations[chatId];

        if (inConversation) {
          await handleConfirmationReply(chatId, text, conversations, submissions);
        } else if (text.startsWith('/start') || text.startsWith('/help')) {
          await sendMessage(chatId,
            `👋 Welcome to <b>NourishNet Bot</b>!\n\n` +
            `I help community organizers add food distribution events to NourishNet.\n\n` +
            `Simply describe your event in plain text:\n\n` +
            `<i>"Free groceries at MLK Library, 901 G St NW DC, Saturday April 19, ` +
            `10am–2pm, no ID needed. Contact: (202) 555-0100"</i>\n\n` +
            `Your event will be live on NourishNet within 6 hours. 🥦\n\n` +
            `<b>Tip:</b> Add this bot to Telegram groups where food events are discussed ` +
            `— it silently detects and adds relevant posts automatically.`
          );
        } else if (isDmRateLimited(chatId, submissions)) {
          await sendMessage(chatId,
            `⚠️ You've reached the limit of ${DM_RATE_LIMIT} submissions per day. ` +
            `Please try again tomorrow.`
          );
        } else {
          await handleNewSubmission(chatId, text, conversations);
        }

      }
      // All other chat types (channel etc.) — silently ignored

    } catch (err) {
      console.error(`  Error processing message [${chatType}:${chatId}]: ${err.message}`);
    }

    offset = Math.max(offset, update.update_id + 1);
  }

  // Persist all state
  writeJson(STATE_FILE,         { last_update_id: offset - 1 });
  writeJson(CONVERSATIONS_FILE,  conversations);
  writeJson(SUBMISSIONS_FILE,    submissions);
  writeJson(HASHES_FILE,         seenHashes);

  console.log(`\n📊 Summary:`);
  console.log(`   DM messages processed:    ${dmCount}`);
  console.log(`   Group messages scanned:   ${groupCount}`);
  console.log(`   New events queued:        ${queuedCount}`);
  console.log(`   Total pending queue:      ${submissions.length}`);
  console.log('\n✅ Bot polling complete.');
}

main().catch(err => {
  console.error('Bot poll failed:', err);
  process.exit(1);
});