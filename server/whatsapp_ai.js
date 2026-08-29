// WhatsApp AI Auto-Responder Engine for New Hyderi Nimco & Frozen
import { generateAIResponse } from './ai_engine.js';

export function handleWhatsAppIncoming(from, messageText) {
  const cleanFrom = from.replace(/[^0-9]/g, '');
  const rawMsg = (messageText || '').trim();

  // Call the core Hyderi AI Knowledge Engine
  const aiResult = generateAIResponse(rawMsg);

  // Format response for WhatsApp (bolding, spacing, and brand signatures)
  let whatsappFormatted = aiResult.reply;

  // Append WhatsApp footer branding
  whatsappFormatted += `\n\n━━━━━━━━━━━━━━━━━━━━\n🥟 *NEW HYDERI NIMCO & FROZEN*\n📍 _Shop # 20-21, Burhani Bagh, Block-E, Hydri, Karachi_\n🌐 Order Online: https://hyderinimco-frozen.com\n📞 0336-2438422 | 0325-2747343 | 021-36625698`;

  return {
    recipient: cleanFrom,
    message: whatsappFormatted,
    suggestedOptions: aiResult.suggestions || [],
    action: aiResult.action,
    timestamp: new Date().toISOString()
  };
}
