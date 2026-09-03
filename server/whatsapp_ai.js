// WhatsApp AI Auto-Responder Engine for New Hyderi Nimco & Frozen
// Keyed by normalized customer phone number (0092/923xx) with max 20 messages memory limit

import { generateAIResponseAsync } from './ai_engine.js';

// In-memory conversation store keyed by customer phone number
const conversationStore = new Map();

/**
 * Get last 20 messages for a given customer phone number
 */
export function getCustomerHistory(phone) {
  const cleanPhone = (phone || '').toString().replace(/[^0-9]/g, '');
  if (!cleanPhone) return [];
  return conversationStore.get(cleanPhone) || [];
}

/**
 * Save a message (user or assistant) into customer history
 */
export function saveCustomerMessage(phone, sender, text) {
  const cleanPhone = (phone || '').toString().replace(/[^0-9]/g, '');
  if (!cleanPhone || !text) return;

  const history = conversationStore.get(cleanPhone) || [];
  history.push({
    sender: sender === 'user' ? 'user' : 'assistant',
    text: String(text).trim(),
    timestamp: new Date().toISOString()
  });

  // Limit conversation history to last 20 messages to keep prompts efficient
  if (history.length > 20) {
    history.splice(0, history.length - 20);
  }

  conversationStore.set(cleanPhone, history);
}

/**
 * Clear customer history upon request or order completion
 */
export function clearCustomerHistory(phone) {
  const cleanPhone = (phone || '').toString().replace(/[^0-9]/g, '');
  if (cleanPhone) {
    conversationStore.delete(cleanPhone);
  }
}

/**
 * Main incoming WhatsApp message handler
 */
export async function handleWhatsAppIncoming(from, messageText) {
  const cleanFrom = (from || '').toString().replace(/[^0-9]/g, '');
  const rawMsg = (messageText || '').trim();

  if (!rawMsg) {
    return { recipient: cleanFrom, message: '', suggestedOptions: [], action: null };
  }

  // 1. Retrieve customer's conversation history
  const history = getCustomerHistory(cleanFrom);

  // 2. Save customer message to history
  saveCustomerMessage(cleanFrom, 'user', rawMsg);

  // 3. Generate response using AI engine (Gemini Flash + MongoDB + Context History)
  const aiResult = await generateAIResponseAsync(rawMsg, history);

  let whatsappFormatted = aiResult.reply || 'Wa Alaikum Assalam! Hyderi Nimco & Frozen me khushamdeed.';

  // 4. Append WhatsApp footer branding ONCE if not already present
  const footerMarker = 'NEW HYDERI NIMCO & FROZEN';
  if (!whatsappFormatted.includes(footerMarker)) {
    whatsappFormatted += `\n\n━━━━━━━━━━━━━━━━━━━━\n🥟 *NEW HYDERI NIMCO & FROZEN*\n📍 _Shop # 20-21, Burhani Bagh, Block-E, Hydri, Karachi_\n🌐 Order Online: https://hyderinimco-frozen.com\n📞 0336-2438422 | 0325-2747343 | 021-36625698`;
  }

  // 5. Save AI assistant reply to customer history
  saveCustomerMessage(cleanFrom, 'assistant', aiResult.reply);

  return {
    recipient: cleanFrom,
    message: whatsappFormatted,
    suggestedOptions: aiResult.suggestions || [],
    action: aiResult.action,
    timestamp: new Date().toISOString()
  };
}
