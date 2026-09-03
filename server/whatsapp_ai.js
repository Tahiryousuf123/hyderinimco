/**
 * WhatsApp AI Message Handler — New Hyderi Nimco & Frozen
 *
 * Per-customer state isolation:
 *   conversationStore: Map<phone, Message[]>   — last 20 messages
 *   processedMsgIds:   Map<phone, Set<msgId>>  — idempotency (dedup)
 *
 * All state is keyed by normalized phone number.
 * Customer A and Customer B NEVER share state.
 */

import { generateAIResponseAsync } from './ai_engine.js';

// ---------------------------------------------------------------------------
// PER-CUSTOMER STORES — all keyed by normalized phone number
// ---------------------------------------------------------------------------

/** Conversation history: Map<phone, Array<{sender, text, timestamp}>> */
const conversationStore = new Map();

/**
 * Processed message ID set for idempotency.
 * Map<phone, Set<messageId>> — prevents processing the same WhatsApp message twice.
 */
const processedMsgIds = new Map();

const MAX_HISTORY = 20;
const MAX_PROCESSED_IDS = 50;

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
function normalizePhone(phone) {
  return (phone || '').toString().replace(/[^0-9]/g, '');
}

export function getCustomerHistory(phone) {
  const p = normalizePhone(phone);
  return p ? (conversationStore.get(p) || []) : [];
}

export function saveCustomerMessage(phone, sender, text) {
  const p = normalizePhone(phone);
  if (!p || !text) return;

  const history = conversationStore.get(p) || [];
  history.push({
    sender: sender === 'user' ? 'user' : 'assistant',
    text: String(text).trim(),
    timestamp: new Date().toISOString()
  });

  // Keep only last 20 messages
  if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
  conversationStore.set(p, history);
}

export function clearCustomerHistory(phone) {
  const p = normalizePhone(phone);
  if (p) {
    conversationStore.delete(p);
    processedMsgIds.delete(p);
  }
}

/**
 * Idempotency check.
 * Returns true if this messageId has already been processed for this phone.
 * Automatically records the ID if it is new.
 */
function isDuplicateMessage(phone, messageId) {
  if (!messageId) return false; // No ID = cannot dedup, allow through
  const p = normalizePhone(phone);
  if (!p) return false;

  const ids = processedMsgIds.get(p) || new Set();

  if (ids.has(messageId)) {
    console.warn(`[WhatsApp AI] Duplicate message ignored: phone=${p} msgId=${messageId}`);
    return true;
  }

  // Record this ID
  ids.add(messageId);

  // FIFO eviction — keep max 50 IDs
  if (ids.size > MAX_PROCESSED_IDS) {
    const oldest = ids.values().next().value;
    ids.delete(oldest);
  }

  processedMsgIds.set(p, ids);
  return false;
}

// ---------------------------------------------------------------------------
// MAIN HANDLER
// ---------------------------------------------------------------------------
/**
 * Handle an incoming WhatsApp message for a customer.
 *
 * @param {string} from        - Customer phone (raw JID or number)
 * @param {string} messageText - The customer's text
 * @param {string} messageId   - Unique Baileys message ID (for idempotency)
 * @returns {Promise<{ recipient, message, suggestions, action, timestamp }>}
 */
export async function handleWhatsAppIncoming(from, messageText, messageId = '') {
  const cleanFrom = normalizePhone(from);
  const rawMsg = (messageText || '').trim();

  if (!rawMsg) {
    return { recipient: cleanFrom, message: '', suggestions: [], action: null };
  }

  // --- Idempotency guard ---
  if (isDuplicateMessage(cleanFrom, messageId)) {
    return { recipient: cleanFrom, message: '', suggestions: [], action: null, _duplicate: true };
  }

  // 1. Load customer's conversation history
  const history = getCustomerHistory(cleanFrom);

  // 2. Save the incoming customer message
  saveCustomerMessage(cleanFrom, 'user', rawMsg);

  let aiResult;
  try {
    // 3. Call Gemini AI agent (function-calling, MongoDB-backed)
    aiResult = await generateAIResponseAsync(rawMsg, history, cleanFrom, messageId);
  } catch (err) {
    console.error(`[WhatsApp AI] Unexpected error in generateAIResponseAsync for ${cleanFrom}:`, err.message);
    aiResult = {
      reply: 'Maafi chahte hain, abhi ek masla aa gaya hai. Thodi der baad dobara try karein ya call karein: 0336-2438422',
      suggestions: [],
      action: null
    };
  }

  const replyText = aiResult.reply || '';

  // 4. Append WhatsApp footer branding (once, if not already present)
  let whatsappFormatted = replyText;
  const footerMarker = 'NEW HYDERI NIMCO';
  if (replyText.length > 0 && !whatsappFormatted.includes(footerMarker)) {
    whatsappFormatted += `\n\n━━━━━━━━━━━━━━━━━━━━\n🥟 *NEW HYDERI NIMCO & FROZEN*\n📍 _Shop # 20-21, Burhani Bagh, Block-E, Hydri, Karachi_\n🌐 https://hyderinimco-frozen.com\n📞 0336-2438422 | 0325-2747343 | 021-36625698`;
  }

  // 5. Save AI reply to history
  if (replyText.length > 0) {
    saveCustomerMessage(cleanFrom, 'assistant', replyText);
  }

  return {
    recipient: cleanFrom,
    message: whatsappFormatted,
    suggestions: aiResult.suggestions || [],
    action: aiResult.action || null,
    timestamp: new Date().toISOString()
  };
}
