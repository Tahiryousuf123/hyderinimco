/**
 * Meta WhatsApp Cloud API Service — New Hyderi Nimco & Frozen
 * Official Meta Graph API Integration for Production Number (+92 325 2747343)
 *
 * Security Guarantee:
 * - NEVER prints or logs META_ACCESS_TOKEN / WHATSAPP_ACCESS_TOKEN.
 * - Sanitizes all error responses before returning or logging.
 */

// In-memory runtime metrics for admin status reporting
let lastWebhookReceived = null;
let lastMessageSent = null;
let lastApiError = null;
let totalMessagesSent = 0;
let totalWebhooksReceived = 0;

/**
 * Normalizes phone numbers to Meta WhatsApp international format (e.g., 923252747343)
 */
export function normalizePhoneNumber(phone) {
  if (!phone) return '';
  let clean = String(phone).replace(/[^0-9]/g, '');
  if (clean.startsWith('03')) {
    clean = '92' + clean.slice(1);
  } else if (!clean.startsWith('92') && clean.length === 10) {
    clean = '92' + clean;
  }
  return clean;
}

/**
 * Returns sanitized configuration supporting both META_ and WHATSAPP_ environment prefixes
 */
export function getMetaConfig() {
  const token = (process.env.META_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
  const phoneId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '1288268431037180').trim();
  const businessAccountId = (process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '').trim();
  const verifyToken = (process.env.META_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN || 'HyderiWhatsApp2026Secure').trim();
  const graphApiVersion = (process.env.META_GRAPH_API_VERSION || 'v20.0').trim();

  return {
    token,
    phoneId,
    businessAccountId,
    verifyToken,
    graphApiVersion
  };
}

/**
 * Sends a standard text message to a customer or business recipient via Meta Cloud API.
 * Allowed during an active 24-hour customer service window.
 *
 * @param {string} to - Recipient phone number
 * @param {string} message - Message text body
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string, details?: any }>}
 */
export async function sendTextMessage(to, message) {
  const { token, phoneId, graphApiVersion } = getMetaConfig();

  if (!token) {
    const errMsg = 'META_ACCESS_TOKEN / WHATSAPP_ACCESS_TOKEN is missing or empty in .env. Outbound message skipped.';
    console.warn(`⚠️ [Meta Cloud API] ${errMsg}`);
    lastApiError = errMsg;
    return { success: false, error: errMsg };
  }

  if (!phoneId) {
    const errMsg = 'WHATSAPP_PHONE_NUMBER_ID is missing. Outbound message skipped.';
    console.warn(`⚠️ [Meta Cloud API] ${errMsg}`);
    lastApiError = errMsg;
    return { success: false, error: errMsg };
  }

  const cleanTo = normalizePhoneNumber(to);
  if (!cleanTo) {
    return { success: false, error: 'Invalid recipient phone number.' };
  }

  const url = `https://graph.facebook.com/${graphApiVersion}/${phoneId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanTo,
    type: 'text',
    text: {
      preview_url: false,
      body: String(message)
    }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      const sanitizedMsg = data.error?.message || `HTTP error ${res.status}`;
      const errCode = data.error?.code || res.status;
      const errorStr = `Meta API Error [${errCode}]: ${sanitizedMsg}`;
      console.error(`❌ [Meta Cloud API] Outbound send failure to ${cleanTo}:`, errorStr);
      lastApiError = errorStr;
      return { success: false, error: errorStr, code: errCode };
    }

    const messageId = data.messages?.[0]?.id || '';
    lastMessageSent = new Date().toISOString();
    totalMessagesSent++;
    lastApiError = null;

    console.log(`✅ [Meta Cloud API] Message dispatched to ${cleanTo} (wamid: ${messageId})`);
    return { success: true, messageId, data };
  } catch (netErr) {
    const netErrMsg = `Network/Fetch error: ${netErr.message || netErr}`;
    console.error(`❌ [Meta Cloud API] Network failure sending to ${cleanTo}:`, netErrMsg);
    lastApiError = netErrMsg;
    return { success: false, error: netErrMsg };
  }
}

/**
 * Sends an approved Meta WhatsApp template message.
 * Required when initiating a conversation outside the 24-hour customer service window.
 *
 * @param {string} to - Recipient phone number
 * @param {string} templateName - Name of the approved template in Meta WhatsApp Manager
 * @param {string} languageCode - Language code (e.g. 'en_US' or 'ur')
 * @param {Array} components - Template components (header, body, buttons)
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
export async function sendTemplateMessage(to, templateName, languageCode = 'en_US', components = []) {
  const { token, phoneId, graphApiVersion } = getMetaConfig();

  if (!token) {
    const errMsg = 'META_ACCESS_TOKEN / WHATSAPP_ACCESS_TOKEN is missing in .env. Template send skipped.';
    lastApiError = errMsg;
    return { success: false, error: errMsg };
  }

  const cleanTo = normalizePhoneNumber(to);
  if (!cleanTo) return { success: false, error: 'Invalid recipient phone number.' };

  const url = `https://graph.facebook.com/${graphApiVersion}/${phoneId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanTo,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: components
    }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      const sanitizedMsg = data.error?.message || `HTTP error ${res.status}`;
      const errCode = data.error?.code || res.status;
      const errorStr = `Meta Template API Error [${errCode}]: ${sanitizedMsg}`;
      lastApiError = errorStr;
      return { success: false, error: errorStr, code: errCode };
    }

    const messageId = data.messages?.[0]?.id || '';
    lastMessageSent = new Date().toISOString();
    totalMessagesSent++;
    return { success: true, messageId, data };
  } catch (err) {
    lastApiError = err.message;
    return { success: false, error: err.message };
  }
}

/**
 * Record incoming webhook event timestamp and increment counters
 */
export function recordWebhookReceived(summary = {}) {
  lastWebhookReceived = new Date().toISOString();
  totalWebhooksReceived++;
}

/**
 * Get current health and status metrics for Meta WhatsApp Cloud API.
 * Never leaks the actual token.
 */
export function getCloudApiStatus() {
  const config = getMetaConfig();
  const hasToken = Boolean(config.token && config.token.length > 0);

  return {
    transport: 'meta_cloud_api',
    productionNumber: '+92 325 2747343',
    phoneNumberId: config.phoneId,
    businessAccountId: config.businessAccountId,
    isConfigured: Boolean(hasToken && config.phoneId),
    hasToken,
    verifyTokenConfigured: Boolean(config.verifyToken),
    lastWebhookReceived,
    lastMessageSent,
    lastApiError,
    totalMessagesSent,
    totalWebhooksReceived,
    graphApiVersion: config.graphApiVersion
  };
}
