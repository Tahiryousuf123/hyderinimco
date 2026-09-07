/**
 * Meta WhatsApp Cloud API Service — New Hyderi Nimco & Frozen
 * Official Meta Graph API Integration for Production Number (+92 325 2747343)
 *
 * Security Guarantee:
 * - NEVER prints or logs META_ACCESS_TOKEN / WHATSAPP_ACCESS_TOKEN.
 * - Sanitizes all error responses before returning or logging.
 */

import fs from 'fs';
import path from 'path';

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
 * Displays an official native "typing..." indicator in customer's WhatsApp chat
 * and marks the incoming customer message as read (blue double ticks).
 * The indicator automatically stays active until the message is replied or up to 25 seconds.
 *
 * @param {string} messageId - Incoming WhatsApp message ID (wamid)
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function sendTypingIndicator(messageId) {
  if (!messageId) return { success: false, error: 'Missing messageId' };
  const { token, phoneId, graphApiVersion } = getMetaConfig();
  if (!token || !phoneId) return { success: false, error: 'Missing token or phoneId' };

  const url = `https://graph.facebook.com/${graphApiVersion}/${phoneId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
    typing_indicator: {
      type: 'text'
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
      // Fallback to simple mark as read if typing_indicator not enabled on api version
      if (data.error?.code === 100) {
        await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            status: 'read',
            message_id: messageId
          })
        }).catch(() => {});
      }
      return { success: false, error: data.error?.message };
    }

    console.log(`💬 [Meta Cloud API] Typing indicator active for message ${messageId}`);
    return { success: true, data };
  } catch (err) {
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

/**
 * Checks if the 24-hour Meta Customer Service Window is currently open.
 * Within 24 hours of customer's last inbound message, free-form text and media messages can be sent.
 *
 * @param {Date|string|number} lastCustomerMessageAt
 * @returns {boolean}
 */
export function isCustomerServiceWindowOpen(lastCustomerMessageAt) {
  if (!lastCustomerMessageAt) return false;
  const msgTime = new Date(lastCustomerMessageAt).getTime();
  if (isNaN(msgTime) || msgTime <= 0) return false;
  const now = Date.now();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  return (now - msgTime) <= TWENTY_FOUR_HOURS;
}

/**
 * Securely downloads incoming media from Meta Graph API using the server-side access token,
 * saving it to disk so the access token is never exposed to the frontend browser.
 *
 * @param {string} mediaId - Meta media ID
 * @param {string} targetDir - Local directory where file should be saved
 * @returns {Promise<{ filename: string, mimeType: string, fileSize: number, publicUrl: string } | null>}
 */
export async function downloadMetaMedia(mediaId, targetDir) {
  const { token, graphApiVersion } = getMetaConfig();
  if (!token || !mediaId) return null;

  try {
    const metaRes = await fetch(`https://graph.facebook.com/${graphApiVersion}/${mediaId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!metaRes.ok) return null;

    const metaData = await metaRes.json();
    const downloadUrl = metaData.url;
    const mimeType = metaData.mime_type || 'application/octet-stream';
    if (!downloadUrl) return null;

    let ext = '.bin';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = '.jpg';
    else if (mimeType.includes('png')) ext = '.png';
    else if (mimeType.includes('webp')) ext = '.webp';
    else if (mimeType.includes('pdf')) ext = '.pdf';
    else if (mimeType.includes('ogg') || mimeType.includes('opus')) ext = '.ogg';
    else if (mimeType.includes('mp4')) ext = '.mp4';
    else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) ext = '.mp3';

    const filename = `media_${mediaId}_${Date.now()}${ext}`;
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const localFilePath = path.join(targetDir, filename);

    const binaryRes = await fetch(downloadUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!binaryRes.ok) return null;

    const arrayBuffer = await binaryRes.arrayBuffer();
    fs.writeFileSync(localFilePath, Buffer.from(arrayBuffer));

    return {
      filename,
      mimeType,
      fileSize: arrayBuffer.byteLength,
      publicUrl: `/uploads/whatsapp/${filename}`
    };
  } catch (err) {
    console.error('[Meta Cloud API] Error downloading media:', err.message);
    return null;
  }
}

/**
 * Sends outbound media (image, document, audio, video) via Meta WhatsApp Cloud API.
 *
 * @param {string} to - Recipient phone number
 * @param {'image'|'document'|'audio'|'video'} mediaType - Type of media
 * @param {string} mediaUrl - Public HTTP(S) URL of media
 * @param {string} [caption] - Optional text caption
 * @param {string} [filename] - Optional filename for documents
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
export async function sendMediaMessage(to, mediaType, mediaUrl, caption = '', filename = '') {
  const { token, phoneId, graphApiVersion } = getMetaConfig();
  if (!token || !phoneId) return { success: false, error: 'Missing token or phoneId' };

  const cleanTo = normalizePhoneNumber(to);
  if (!cleanTo) return { success: false, error: 'Invalid recipient phone number' };

  const validTypes = ['image', 'document', 'audio', 'video'];
  const type = validTypes.includes(mediaType) ? mediaType : 'image';

  const mediaObj = { link: mediaUrl };
  if (caption && (type === 'image' || type === 'document' || type === 'video')) {
    mediaObj.caption = String(caption);
  }
  if (filename && type === 'document') {
    mediaObj.filename = String(filename);
  }

  const url = `https://graph.facebook.com/${graphApiVersion}/${phoneId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanTo,
    type: type,
    [type]: mediaObj
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
      const errMsg = data.error?.message || `HTTP ${res.status}`;
      return { success: false, error: errMsg, code: data.error?.code };
    }

    const messageId = data.messages?.[0]?.id || '';
    lastMessageSent = new Date().toISOString();
    totalMessagesSent++;
    return { success: true, messageId, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

