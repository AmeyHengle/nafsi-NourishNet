/**
 * bot-poll.js
 * Polls the Telegram Bot API for new messages (no server needed).
 * Runs via GitHub Actions on a schedule (every 15 minutes).
 *
 * Conversation flow:
 *   Organizer sends message/text
 *     → Bot extracts structured data with Groq
 *     → Bot replies with summary and asks YES / NO / EDIT <field> <value>
 *     → On YES: record added to pending_submissions.json
 *     → On NO: conversation cleared
 *     → On EDIT: specific field updated, re-confirms
 *
 * State is persisted in public/bot_state.json and public/bot_conversations.json
 * so each Actions run picks up where the last one left off.
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { extractFromText } = require('./extractor');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = `https://api.telegram.org/bot${TOKEN}`;

const STATE_FILE = path.join(__dirname, '../public/bot_state.json');
const CONVERSATIONS_FILE = path.join(__dirname, '../public/bot_conversations.json');
const SUBMISSIONS_FILE = path.join(__dirname, '../public/pending_submissions.json');

// ─────────────────────────────────────────────
// File helpers
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// Telegram API helpers
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// Message formatting
// ─────────────────────────────────────────────

/**
 * Format extracted entity fields into a readable Telegram message.
 */
function formatEntitySummary(entity) {
  const lines = [
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
  ];
  return lines.join('\n');
}

// ─────────────────────────────────────────────
// Conversation handlers
// ─────────────────────────────────────────────

/**
 * Handle a fresh incoming message — extract entities and start confirmation flow.
 */
async function handleNewSubmission(chatId, text, conversations) {
  await sendMessage(chatId,
    '🔍 Got it! Analyzing your message, one moment...'
  );

  const result = await extractFromText(text);

  if (!result.entities || result.entities.length === 0) {
    await sendMessage(chatId,
      `❓ I couldn't extract any food event details from that message.\n\n` +
      `Please try including:\n` +
      `• Event name\n• Address or location\n• Date and time\n• Who it's for\n\n` +
      `Example: <i>"We're hosting a free food distribution at MLK Library, 901 G St NW DC, ` +
      `this Saturday April 19 from 10am to 2pm. No ID required."</i>`
    );
    return;
  }

  // Take the highest-confidence entity
  const entity = result.entities.sort(
    (a, b) => (b.confidence_score || 0) - (a.confidence_score || 0)
  )[0];

  // Store conversation state
  conversations[chatId] = {
    state: 'awaiting_confirmation',
    entity,
    original_text: text,
    started_at: new Date().toISOString()
  };

  await sendMessage(chatId, formatEntitySummary(entity));
}

/**
 * Handle a reply to the confirmation prompt (YES / NO / EDIT ...).
 */
async function handleConfirmationReply(chatId, text, conversations) {
  const convo = conversations[chatId];
  if (!convo) return;  // Stale reply — ignore

  const upper = text.trim().toUpperCase();

  // ── YES ─────────────────────────────────────
  if (upper === 'YES') {
    const submissions = readJson(SUBMISSIONS_FILE, []);
    submissions.push({
      ...convo.entity,
      source: 'community',
      submitted_via: 'telegram',
      submitted_at: new Date().toISOString()
    });
    writeJson(SUBMISSIONS_FILE, submissions);

    delete conversations[chatId];

    await sendMessage(chatId,
      `✅ <b>Submitted!</b> Your event will appear on NourishNet within 6 hours.\n\n` +
      `Thank you for helping your community! 🥗\n\n` +
      `Send another message any time to add more events.`
    );
    return;
  }

  // ── NO ──────────────────────────────────────
  if (upper === 'NO' || upper === 'CANCEL') {
    delete conversations[chatId];
    await sendMessage(chatId,
      `❌ Submission cancelled. Send a new message whenever you're ready.`
    );
    return;
  }

  // ── EDIT <field> <value> ─────────────────────
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
        `❓ Unknown field "<b>${field}</b>". ` +
        `Editable fields: ${editableFields.join(', ')}`
      );
      return;
    }

    convo.entity[field] = value;
    conversations[chatId] = convo;

    await sendMessage(chatId,
      `✏️ Updated <b>${field}</b>. Here's the revised summary:\n\n` +
      formatEntitySummary(convo.entity)
    );
    return;
  }

  // ── Unrecognised reply ───────────────────────
  await sendMessage(chatId,
    `Please reply with:\n` +
    `• <b>YES</b> — submit this event\n` +
    `• <b>NO</b> — cancel\n` +
    `• <b>EDIT address 123 Main St</b> — correct a field`
  );
}

// ─────────────────────────────────────────────
// Rate limiting (per chat)
// ─────────────────────────────────────────────

const RATE_LIMIT = 3;  // max submissions per chat per day

function isRateLimited(chatId, submissions) {
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = submissions.filter(
    s => s.submitted_via === 'telegram' &&
         String(s.chat_id) === String(chatId) &&
         (s.submitted_at || '').startsWith(today)
  ).length;
  return todayCount >= RATE_LIMIT;
}

// ─────────────────────────────────────────────
// Main polling loop
// ─────────────────────────────────────────────

async function main() {
  console.log('🤖 NourishNet Telegram bot polling started...\n');

  if (!TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not set. Exiting.');
    process.exit(1);
  }

  const state = readJson(STATE_FILE, { last_update_id: 0 });
  const conversations = readJson(CONVERSATIONS_FILE, {});
  const submissions = readJson(SUBMISSIONS_FILE, []);

  let offset = (state.last_update_id || 0) + 1;

  const updates = await getUpdates(offset);
  console.log(`  Found ${updates.length} new update(s)\n`);

  for (const update of updates) {
    const msg = update.message;
    if (!msg || !msg.text) {
      // Skip non-text messages for now (photos handled in future iteration)
      offset = Math.max(offset, update.update_id + 1);
      continue;
    }

    const chatId = String(msg.chat.id);
    const text = msg.text.trim();

    console.log(`  Message from ${chatId}: "${text.slice(0, 60)}..."`);

    try {
      const isInConversation = !!conversations[chatId];

      if (!isInConversation) {
        // New submission — check rate limit first
        if (isRateLimited(chatId, submissions)) {
          await sendMessage(chatId,
            `⚠️ You've reached the limit of ${RATE_LIMIT} submissions per day. ` +
            `Please try again tomorrow.`
          );
        } else if (text.startsWith('/start') || text.startsWith('/help')) {
          await sendMessage(chatId,
            `👋 Welcome to <b>NourishNet Bot</b>!\n\n` +
            `I help community organizers add food distribution events to NourishNet.\n\n` +
            `Simply describe your event in plain text and I'll extract the details:\n\n` +
            `<i>Example: "Free groceries at MLK Library, 901 G St NW DC, ` +
            `Saturday April 19, 10am–2pm, no ID needed. Contact: (202) 555-0100"</i>\n\n` +
            `Your event will be live on NourishNet within 6 hours. 🥦`
          );
        } else {
          await handleNewSubmission(chatId, text, conversations);
        }
      } else {
        // Existing conversation — handle YES/NO/EDIT
        await handleConfirmationReply(chatId, text, conversations);
      }
    } catch (err) {
      console.error(`  Error processing message from ${chatId}: ${err.message}`);
    }

    offset = Math.max(offset, update.update_id + 1);
  }

  // Persist updated state
  writeJson(STATE_FILE, { last_update_id: offset - 1 });
  writeJson(CONVERSATIONS_FILE, conversations);

  console.log('\n✅ Bot polling complete.');
}

main().catch(err => {
  console.error('Bot poll failed:', err);
  process.exit(1);
});