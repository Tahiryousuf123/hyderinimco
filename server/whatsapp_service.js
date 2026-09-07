import makeWASocket, { DisconnectReason, useMultiFileAuthState, Browsers } from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { handleWhatsAppIncoming } from './whatsapp_ai.js';
import { WASession } from './models/WASession.js';
import { isDBConnected } from './db.js';
import { sendTextMessage, sendTemplateMessage, getCloudApiStatus } from './services/whatsappCloudApi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_DIR = path.join(__dirname, 'auth_baileys');

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

let sock = null;
let latestQR = null;
let rawQR = null;
let connectionStatus = 'initializing'; // 'awaiting_scan', 'connected', 'disconnected'
let connectedPhone = null;
let isStartingService = false;

// Track active customer chats for 3-Hour AI Follow-Up Engine
const activeChats = new Map();

function getSettings() {
  try {
    const p = path.join(__dirname, 'data', 'settings.json');
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {}
  return { aiAutoReplyEnabled: true, aiFollowUpEnabled: true };
}

export function isAiAutoReplyEnabled() {
  const s = getSettings();
  return s.aiAutoReplyEnabled !== false;
}

export function isAiFollowUpEnabled() {
  const s = getSettings();
  return s.aiFollowUpEnabled !== false;
}

export function setAiAutoReply(enabled) {
  try {
    const p = path.join(__dirname, 'data', 'settings.json');
    let s = {};
    if (fs.existsSync(p)) s = JSON.parse(fs.readFileSync(p, 'utf8'));
    s.aiAutoReplyEnabled = !!enabled;
    fs.writeFileSync(p, JSON.stringify(s, null, 2), 'utf8');
    return { success: true, aiAutoReplyEnabled: s.aiAutoReplyEnabled, aiFollowUpEnabled: s.aiFollowUpEnabled !== false };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export function setAiFollowUp(enabled) {
  try {
    const p = path.join(__dirname, 'data', 'settings.json');
    let s = {};
    if (fs.existsSync(p)) s = JSON.parse(fs.readFileSync(p, 'utf8'));
    s.aiFollowUpEnabled = !!enabled;
    fs.writeFileSync(p, JSON.stringify(s, null, 2), 'utf8');
    return { success: true, aiAutoReplyEnabled: s.aiAutoReplyEnabled !== false, aiFollowUpEnabled: s.aiFollowUpEnabled };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Restore WhatsApp Session Files from MongoDB Atlas to Local Ephemeral Disk
async function restoreAuthFromDB() {
  if (!isDBConnected()) return false;
  try {
    const docs = await WASession.find({}).lean();
    if (docs && docs.length > 0) {
      if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
      let restoredCount = 0;
      for (const doc of docs) {
        try {
          const filepath = path.join(AUTH_DIR, doc.key);
          fs.writeFileSync(filepath, doc.data, 'utf8');
          restoredCount++;
        } catch (fErr) {
          // Ignore write error for any corrupt file entry
        }
      }
      console.log(`✅ [WhatsApp Auth Sync] Successfully restored ${restoredCount} session key files from MongoDB Atlas.`);
      return true;
    }
  } catch (e) {
    console.error('[WhatsApp Auth Sync] Warning: Failed to restore session from MongoDB Atlas:', e.message);
  }
  return false;
}

// Thread-safe debounced backup of session files from Local Ephemeral Disk to MongoDB Atlas
let isBackingUp = false;
let backupPending = false;
let backupTimer = null;

export function scheduleAuthBackup(delayMs = 1200) {
  if (backupTimer) clearTimeout(backupTimer);
  backupTimer = setTimeout(() => {
    backupAuthToDB().catch(() => {});
  }, delayMs);
}

async function backupAuthToDB() {
  if (!isDBConnected() || !fs.existsSync(AUTH_DIR)) return;
  if (isBackingUp) {
    backupPending = true;
    return;
  }
  isBackingUp = true;
  backupPending = false;

  try {
    let files = [];
    try {
      files = fs.readdirSync(AUTH_DIR);
    } catch (rErr) {
      return;
    }

    const bulkOps = [];
    const activeKeys = [];

    for (const file of files) {
      const filepath = path.join(AUTH_DIR, file);
      try {
        if (!fs.existsSync(filepath)) continue;
        const stat = fs.statSync(filepath);
        if (!stat.isFile()) continue;
        const content = fs.readFileSync(filepath, 'utf8');
        if (!content) continue;

        activeKeys.push(file);
        bulkOps.push({
          updateOne: {
            filter: { key: file },
            update: { $set: { key: file, data: content } },
            upsert: true
          }
        });
      } catch (perFileErr) {
        // Baileys deleted or updated a temporary pre-key concurrently. Safely ignore and continue.
        continue;
      }
    }

    if (bulkOps.length > 0) {
      await WASession.bulkWrite(bulkOps, { ordered: false });
      // Remove stale/consumed pre-keys from MongoDB that Baileys unlinked on disk
      if (activeKeys.length > 0) {
        await WASession.deleteMany({ key: { $nin: activeKeys } }).catch(() => {});
      }
      console.log(`💾 [WhatsApp Auth Sync] Successfully backed up ${bulkOps.length} auth key files to MongoDB Atlas.`);
    }
  } catch (e) {
    console.error('[WhatsApp Auth Sync] Warning: Failed to backup session to MongoDB Atlas:', e.message);
  } finally {
    isBackingUp = false;
    if (backupPending) {
      scheduleAuthBackup(500);
    }
  }
}

export async function startWhatsAppService() {
  // Baileys is deactivated by default for production number (+92 325 2747343)
  // Official Meta WhatsApp Cloud API is the authoritative production transport.
  if (process.env.ENABLE_BAILEYS !== 'true') {
    console.log('ℹ️ [WhatsApp Service] Baileys socket disabled for production number (+92 325 2747343). Official Meta Cloud API is active.');
    return;
  }

  if (isStartingService) {
    console.log('⚠️ [WhatsApp Service] Service initialization already in progress. Bypassing duplicate call.');
    return;
  }
  if (connectionStatus === 'connected' && sock) {
    console.log('✅ [WhatsApp Service] WhatsApp AI is already connected and active.');
    return;
  }

  isStartingService = true;

  try {
    // Step 1: Restore authenticated session files from MongoDB Atlas before initializing Baileys
    await restoreAuthFromDB();

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: Browsers.windows('Desktop'),
      syncFullHistory: false,
      connectTimeoutMs: 30000,
      keepAliveIntervalMs: 15000
    });

    sock.ev.on('creds.update', async () => {
      await saveCreds();
      scheduleAuthBackup(1200);
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        rawQR = qr;
        try {
          latestQR = await QRCode.toDataURL(qr, {
            width: 320,
            margin: 2,
            color: { dark: '#08281F', light: '#FFFFFF' }
          });
          connectionStatus = 'awaiting_scan';
          console.log('📲 [WhatsApp Service] New Live Pairing QR Code generated!');
        } catch (err) {
          console.error('Error generating QR DataURL:', err);
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        console.log(`⚠️ [WhatsApp Service] Connection closed (code: ${statusCode})...`);

        connectionStatus = 'disconnected';
        latestQR = null;
        isStartingService = false;

        const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 403;
        if (isLoggedOut) {
          console.log('⚠️ [WhatsApp Service] Device unlinked or restricted by WhatsApp (code: ' + statusCode + '). Wiping session keys...');
          try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (e) {}
          if (isDBConnected()) {
            try { await WASession.deleteMany({}); } catch (e) {}
          }
          connectedPhone = null;
          // Halt auto-reconnect immediately so WhatsApp servers are not hit repeatedly
          console.log('🛑 [WhatsApp Service] Auto-reconnect halted to protect account from automated flagging.');
          return;
        }

        const hasCreds = fs.existsSync(path.join(AUTH_DIR, 'creds.json'));
        
        // Prevent infinite QR generation loop on Code 408 timeout if no credentials exist
        if (statusCode === 408 && !hasCreds) {
          console.log('⏳ [WhatsApp Service] QR scan window timed out. Awaiting manual QR scan request.');
          return;
        }

        const retryDelay = hasCreds ? 5000 : 15000;
        setTimeout(() => {
          startWhatsAppService();
        }, retryDelay);

      } else if (connection === 'open') {
        connectionStatus = 'connected';
        isStartingService = false;
        latestQR = null;
        rawQR = null;
        const userJid = sock.user?.id || '';
        connectedPhone = userJid.split(':')[0] || userJid.split('@')[0];
        console.log(`✅ [WhatsApp Service] WhatsApp AI Successfully Connected! Phone: ${connectedPhone}`);

        // Persist fresh authenticated credentials to MongoDB Atlas
        scheduleAuthBackup(500);
      }
    });

    // Handle Incoming WhatsApp Messages & Auto-Respond via AI
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        const remoteJid = msg.key.remoteJid;
        if (!remoteJid || remoteJid.includes('@g.us')) continue;

        const text = 
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          '';

        if (!text.trim()) continue;

        const customerPhone = remoteJid.split('@')[0];
        const messageId = msg.key.id || '';
        console.log(`📩 [WhatsApp AI] Received message from ${customerPhone}: "${text}"`);

        // Record active conversation timestamp for 3-Hour AI Follow-Up Engine
        activeChats.set(customerPhone, {
          lastMsgTime: Date.now(),
          lastText: text,
          followUpSent: false,
          orderPlaced: false
        });

        // Check if AI Agent Auto-Reply is enabled by shop owner
        if (!isAiAutoReplyEnabled()) {
          console.log(`⏸️ [WhatsApp AI] AI Auto-Reply is paused by owner.`);
          continue;
        }

        try {
          // 1. Natural Human Reading Delay (1.5 - 3.5s based on incoming message length)
          const readDelayMs = Math.min(3500, Math.max(1500, (text.length || 10) * 35)) + Math.floor(Math.random() * 800);
          await new Promise(r => setTimeout(r, readDelayMs));

          // 2. Mark message as read & send "typing..." presence on WhatsApp
          try {
            await sock.readMessages([msg.key]);
            await sock.sendPresenceUpdate('composing', remoteJid);
          } catch (pErr) {}

          // 3. Generate Intelligent Response via AI Agent (Groq / Gemini)
          const aiResponse = await handleWhatsAppIncoming(customerPhone, text, messageId);

          // Skip sending if duplicate message was detected
          if (aiResponse._duplicate) {
            console.log(`⚡ [WhatsApp AI] Duplicate message skipped for ${customerPhone}`);
            try { await sock.sendPresenceUpdate('paused', remoteJid); } catch (e) {}
            continue;
          }

          const replyText = aiResponse?.message || '';
          if (!replyText) {
            try { await sock.sendPresenceUpdate('paused', remoteJid); } catch (e) {}
            continue;
          }

          // 4. Realistic Human Typing Duration (2.5s - 6s depending on reply length)
          // Real humans take time to type. This prevents WhatsApp anti-bot / anti-spam account bans.
          const typingDurationMs = Math.min(6000, Math.max(2500, (replyText.length || 50) * 25)) + Math.floor(Math.random() * 1000);
          console.log(`⌨️ [WhatsApp AI] Simulating human typing presence for ${typingDurationMs}ms to ${customerPhone}...`);
          await new Promise(r => setTimeout(r, typingDurationMs));

          // 5. Pause presence and send message
          try {
            await sock.sendPresenceUpdate('paused', remoteJid);
          } catch (e) {}

          await sock.sendMessage(remoteJid, { text: replyText });
          console.log(`🤖 [WhatsApp AI] Natural human-like reply sent to ${customerPhone}`);
        } catch (sendErr) {
          console.error(`❌ Failed to send WhatsApp auto-reply to ${remoteJid}:`, sendErr);
          try { await sock.sendPresenceUpdate('paused', remoteJid); } catch (e) {}
        }
      }
    });

    // Start 15-Minute Background Interval for Automated 3-Hour AI Follow-Up Engine
    setInterval(() => {
      runAiFollowUpCheck();
    }, 15 * 60 * 1000);

  } catch (err) {
    isStartingService = false;
    console.error('Fatal WhatsApp Service Error:', err);
    connectionStatus = 'disconnected';
    setTimeout(() => startWhatsAppService(), 10000);
  }
}

// Background AI Engine: 3-Hour Gentle & Respectful Customer Follow-Up
function runAiFollowUpCheck() {
  if (!sock || connectionStatus !== 'connected' || !isAiFollowUpEnabled()) return;

  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
  const now = Date.now();

  for (const [phone, chat] of activeChats.entries()) {
    if (chat.orderPlaced || chat.followUpSent) continue;

    const elapsed = now - chat.lastMsgTime;
    if (elapsed >= THREE_HOURS_MS) {
      const followUpText = 
        `Assalam o Alaikum! 👋✨\n\n` +
        `Umeed hai aap khairiyat se honge. Aap ne kuch der pehle Hyderi Nimco & Frozen se maloomat li thi.\n\n` +
        `🥟 Kya aap ko aaj ka fresh order book karwane me koi madad chahiye? Karachi ke tamam areas me fresh express delivery dastiyab hai!\n\n` +
        `Aap yahan WhatsApp par hi apna order bata sakte hain ya website visit karein: https://hyderinimco-frozen.com 🤝`;

      let cleanPhone = phone.replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('03')) cleanPhone = '92' + cleanPhone.slice(1);
      const jid = `${cleanPhone}@s.whatsapp.net`;

      sock.sendMessage(jid, { text: followUpText })
        .then(() => {
          chat.followUpSent = true;
          console.log(`🤖 [AI Follow-Up] Successfully sent 3-hour warm follow-up to ${phone}`);
        })
        .catch(err => console.error(`Failed AI follow-up to ${phone}:`, err));
    }
  }
}

export function getWhatsAppStatus() {
  const cloudStatus = getCloudApiStatus();
  return {
    ...cloudStatus,
    baileysStatus: connectionStatus,
    qr: latestQR,
    phone: connectedPhone || '+92 325 2747343',
    aiAutoReplyEnabled: isAiAutoReplyEnabled(),
    aiFollowUpEnabled: isAiFollowUpEnabled()
  };
}

export async function disconnectWhatsApp() {
  try {
    if (sock) {
      await sock.logout();
    }
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    if (isDBConnected()) {
      try { await WASession.deleteMany({}); } catch (e) {}
    }
    connectionStatus = 'disconnected';
    latestQR = null;
    connectedPhone = null;
    isStartingService = false;
    setTimeout(() => startWhatsAppService(), 2000);
    return { success: true, message: 'Logged out successfully' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// WhatsApp Mass Broadcast / Deal Blast Engine
export async function sendMassBroadcast(recipients, messageText, imageUrl = null) {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return { success: false, error: 'No customer phone numbers provided for broadcast.' };
  }

  const useCloudApi = Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_ACCESS_TOKEN.trim());

  if (!useCloudApi && (!sock || connectionStatus !== 'connected')) {
    return { success: false, error: 'WhatsApp Cloud API token is not configured and Baileys is not connected.' };
  }

  let sentCount = 0;
  let failedCount = 0;

  for (const rawPhone of recipients) {
    try {
      let phone = String(rawPhone).replace(/[^0-9]/g, '');
      if (!phone) continue;
      if (phone.startsWith('03')) phone = '92' + phone.slice(1);
      else if (!phone.startsWith('92')) phone = '92' + phone;

      if (useCloudApi) {
        await sendTextMessage(phone, messageText);
      } else {
        const jid = `${phone}@s.whatsapp.net`;
        if (imageUrl) {
          await sock.sendMessage(jid, {
            image: { url: imageUrl },
            caption: messageText
          });
        } else {
          await sock.sendMessage(jid, { text: messageText });
        }
      }
      sentCount++;
      // Safe delay between messages
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`Broadcast error for phone ${rawPhone}:`, err);
      failedCount++;
    }
  }

  return { success: true, sentCount, failedCount, total: recipients.length };
}

export async function notifyOwnerNewOrder(order) {
  const useCloudApi = Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_ACCESS_TOKEN.trim());
  if (!useCloudApi && (!sock || connectionStatus !== 'connected')) {
    console.log('ℹ️ [WhatsApp Service] Cloud API token not set and Baileys socket not connected; skipping owner alert.');
    return;
  }

  // Mark customer phone as orderPlaced so AI 3-Hour follow-up is skipped
  if (order.customer?.phone) {
    const rawP = String(order.customer.phone).replace(/[^0-9]/g, '');
    activeChats.set(rawP, { orderPlaced: true, followUpSent: true });
  }

  const itemsList = (order.items || [])
    .map(it => `• *${it.quantity}x* ${it.name} (${it.packQuantity}) - Rs. ${it.price * it.quantity}/-`)
    .join('\n');

  const baseUrl = process.env.RENDER_EXTERNAL_URL || 'https://hyderinimco.onrender.com';
  const slipUrl = order.paymentDetails?.paymentSlipUrl
    ? (order.paymentDetails.paymentSlipUrl.startsWith('http')
        ? order.paymentDetails.paymentSlipUrl
        : `${baseUrl}${order.paymentDetails.paymentSlipUrl}`)
    : null;

  const text = `🔔 *NEW ORDER RECEIVED - HYDERI NIMCO & FROZEN* 🥟\n\n` +
    `📋 *Order Ref:* ${order.orderRef}\n` +
    `👤 *Customer Name:* ${order.customer?.fullName || 'N/A'}\n` +
    `📞 *Customer Phone:* ${order.customer?.phone || 'N/A'}\n` +
    `📍 *Area:* ${order.customer?.area || 'N/A'}\n` +
    `🏠 *Delivery Address:* ${order.customer?.address || 'N/A'}\n\n` +
    `🛒 *Items Ordered:*\n${itemsList}\n\n` +
    `💰 *Subtotal:* Rs. ${order.subtotal}/-\n` +
    `🛵 *Delivery Fee:* Rs. ${order.deliveryFee}/-\n` +
    `💵 *Total Amount:* Rs. ${order.totalAmount}/-\n\n` +
    `💳 *Payment Method:* ${order.paymentMethod === 'cod' ? '💵 CASH ON DELIVERY (COD)' : order.paymentMethod.toUpperCase()}\n` +
    (order.paymentDetails?.transactionId ? `🔢 *TID:* ${order.paymentDetails.transactionId}\n` : '') +
    (order.paymentDetails?.senderAccountName ? `👤 *Sender Title:* ${order.paymentDetails.senderAccountName}\n` : '') +
    (slipUrl ? `🧾 *Payment Slip:* ${slipUrl}\n` : '') +
    (order.notes ? `📝 *Customer Notes:* ${order.notes}\n` : '') +
    `\n⏰ *Time:* ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`;

  const settings = getSettings();
  const envOwnerPhone = process.env.OWNER_NOTIFICATION_PHONE || process.env.SHOP_OWNER_PHONE;
  let rawList = [];

  if (envOwnerPhone) {
    rawList.push(...envOwnerPhone.split(',').map(s => s.trim()));
  }
  if (settings.ownerNotificationPhones && Array.isArray(settings.ownerNotificationPhones) && settings.ownerNotificationPhones.length > 0) {
    rawList.push(...settings.ownerNotificationPhones);
  }
  if (rawList.length === 0) {
    rawList = ['923362438422'];
  }

  // Strictly route ONLY to official shop owner (03362438422).
  // Strictly exclude 03363925950 and the Meta sender number 03252747343
  const excludedNumbers = new Set(['923252747343', '923363925950', '03363925950', '3363925950', '03252747343', '3252747343']);
  const recipientPhones = Array.from(new Set(rawList.map(p => {
    let clean = String(p).replace(/[^0-9]/g, '');
    if (clean.startsWith('03')) clean = '92' + clean.slice(1);
    else if (!clean.startsWith('92')) clean = '92' + clean;
    return clean;
  }).filter(p => p && !excludedNumbers.has(p))));

  if (recipientPhones.length === 0) {
    recipientPhones.push('923362438422');
  }

  for (const phone of recipientPhones) {
    try {
      if (useCloudApi) {
        const sendRes = await sendTextMessage(phone, text);
        if (sendRes.success) {
          console.log(`✅ [Meta Cloud API] Direct order alert sent to shop owner ${phone}!`);
        } else {
          console.warn(`⚠️ [Meta Cloud API] Order alert to owner ${phone} returned:`, sendRes.error);
        }
      } else {
        const jid = `${phone}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text });
        console.log(`✅ [WhatsApp Service] Direct order alert sent to shop owner ${phone}!`);
      }
    } catch (err) {
      console.error(`Failed to send order notification to ${phone}:`, err);
    }
  }
}

/**
 * Sends official WhatsApp order receipt slip directly to customer's phone
 */
export async function sendCustomerOrderSlip(order) {
  const customerPhone = order.customer?.phone;
  if (!customerPhone) {
    console.warn('⚠️ [WhatsApp Service] No customer phone provided in order; skipping customer slip.');
    return { success: false, error: 'No phone' };
  }

  let cleanPhone = String(customerPhone).replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('03')) cleanPhone = '92' + cleanPhone.slice(1);
  else if (!cleanPhone.startsWith('92') && cleanPhone.length === 10) cleanPhone = '92' + cleanPhone;

  if (cleanPhone.length < 10) {
    console.warn(`⚠️ [WhatsApp Service] Invalid customer phone format (${customerPhone}); skipping customer slip.`);
    return { success: false, error: 'Invalid phone format' };
  }

  const useCloudApi = Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_ACCESS_TOKEN.trim());

  const itemsList = (order.items || [])
    .map(it => `• *${it.quantity}x* ${it.name} (${it.packQuantity}) - Rs. ${it.price * it.quantity}/-`)
    .join('\n');

  const customerReceipt = `🧾 *NEW HYDERI NIMCO & FROZEN (SINCE 1970)*\n` +
    `*OFFICIAL ORDER RECEIPT & SLIP* 🥟\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📋 *Order Ref:* ${order.orderRef}\n` +
    `👤 *Customer:* ${order.customer?.fullName || 'Valued Customer'}\n` +
    `📞 *Phone:* ${order.customer?.phone || cleanPhone}\n` +
    `📍 *Area:* ${order.customer?.area || 'Karachi'}\n` +
    `🏠 *Address:* ${order.customer?.address || 'N/A'}\n` +
    `⏰ *Date:* ${order.formattedDate || new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}\n\n` +
    `🛒 *ITEMS ORDERED:*\n${itemsList}\n\n` +
    `💰 *Subtotal:* Rs. ${order.subtotal}/-\n` +
    `🛵 *Delivery Fee:* ${order.deliveryFee === 0 ? 'FREE' : `Rs. ${order.deliveryFee}/-`}\n` +
    `💵 *Total Amount:* Rs. ${order.totalAmount}/-\n\n` +
    `💳 *Payment Method:* ${order.paymentMethod === 'cod' ? '💵 Cash on Delivery (COD)' : order.paymentMethod?.toUpperCase()}\n` +
    (order.paymentDetails?.transactionId ? `🔢 *TID / Ref:* ${order.paymentDetails.transactionId}\n` : '') +
    (order.paymentDetails?.senderAccountName ? `👤 *Sender Title:* ${order.paymentDetails.senderAccountName}\n` : '') +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📌 *Order Status:* ⏳ Pending Verification\n` +
    `🚀 *Order Tracking:* Track on website with Ref: *${order.orderRef}*\n\n` +
    `⚠️ *Order Cancellation / Changes:*\n` +
    `Agar aapko yeh order cancel ya modify karna ho, to website par screen se foran "Cancel Order" karein ya humein yahan reply karein: "CANCEL ${order.orderRef}"\n\n` +
    `📞 *Hotline:* 0336-2438422 | 021-36625698\n` +
    `_Shukriya Hyderi Nimco par aitmaad karne ka! Humara rider jald aap se rabta karega._`;

  try {
    if (useCloudApi) {
      const res = await sendTextMessage(cleanPhone, customerReceipt);
      if (res.success) {
        console.log(`✅ [Meta Cloud API] Official Order Slip sent to customer at ${cleanPhone} (Ref: ${order.orderRef})`);
        return { success: true, messageId: res.messageId };
      } else {
        console.warn(`⚠️ [Meta Cloud API] Failed to send order slip to customer ${cleanPhone}:`, res.error);
        return { success: false, error: res.error };
      }
    } else if (sock && connectionStatus === 'connected') {
      const jid = `${cleanPhone}@s.whatsapp.net`;
      await sock.sendMessage(jid, { text: customerReceipt });
      console.log(`✅ [WhatsApp Baileys] Official Order Slip sent to customer at ${cleanPhone} (Ref: ${order.orderRef})`);
      return { success: true };
    } else {
      console.log(`ℹ️ [WhatsApp Service] No active WhatsApp connection to send customer slip to ${cleanPhone}.`);
      return { success: false, error: 'No connection' };
    }
  } catch (err) {
    console.error(`❌ [WhatsApp Service] Error sending customer slip to ${cleanPhone}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Notifies shop owner that an order has been cancelled by customer
 */
export async function notifyOwnerOrderCancelled(order, reason = '') {
  const useCloudApi = Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_ACCESS_TOKEN.trim());
  const text = `❌ *ORDER CANCELLED BY CUSTOMER - HYDERI NIMCO* ⚠️\n\n` +
    `📋 *Order Ref:* ${order.orderRef}\n` +
    `👤 *Customer Name:* ${order.customer?.fullName || 'N/A'}\n` +
    `📞 *Customer Phone:* ${order.customer?.phone || 'N/A'}\n` +
    `📍 *Area:* ${order.customer?.area || 'N/A'}\n` +
    `💵 *Total Amount:* Rs. ${order.totalAmount}/-\n` +
    `💳 *Payment Method:* ${order.paymentMethod?.toUpperCase()}\n` +
    (reason ? `📝 *Cancellation Reason:* ${reason}\n` : '') +
    `\n⏰ *Time:* ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`;

  const recipientPhones = ['923362438422'];
  for (const phone of recipientPhones) {
    try {
      if (useCloudApi) {
        await sendTextMessage(phone, text);
      } else if (sock && connectionStatus === 'connected') {
        await sock.sendMessage(`${phone}@s.whatsapp.net`, { text });
      }
      console.log(`✅ [WhatsApp Service] Owner alerted of order cancellation: ${order.orderRef}`);
    } catch (err) {
      console.error(`Failed to alert owner of cancellation:`, err.message);
    }
  }
}

/**
 * Notifies customer that their cancellation request has been executed
 */
export async function notifyCustomerOrderCancelled(order, reason = '') {
  const customerPhone = order.customer?.phone;
  if (!customerPhone) return;

  let cleanPhone = String(customerPhone).replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('03')) cleanPhone = '92' + cleanPhone.slice(1);
  else if (!cleanPhone.startsWith('92') && cleanPhone.length === 10) cleanPhone = '92' + cleanPhone;

  const text = `❌ *ORDER CANCELLED - HYDERI NIMCO & FROZEN*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `Aapka order *${order.orderRef}* kamiyabi se cancel ho gaya hai.\n` +
    `💵 Total Bill: Rs. ${order.totalAmount}/-\n` +
    (reason ? `📝 Wajah: ${reason}\n` : '') +
    `\nOnline payment refund ya kisi bhi sawal ke liye humari helpline par rabta karein: 0336-2438422 | 021-36625698.\n` +
    `_Shukriya Hyderi Nimco!_`;

  const useCloudApi = Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_ACCESS_TOKEN.trim());
  try {
    if (useCloudApi) {
      await sendTextMessage(cleanPhone, text);
    } else if (sock && connectionStatus === 'connected') {
      await sock.sendMessage(`${cleanPhone}@s.whatsapp.net`, { text });
    }
    console.log(`✅ [WhatsApp Service] Customer notified of cancellation: ${cleanPhone}`);
  } catch (err) {
    console.error(`Failed to notify customer of cancellation:`, err.message);
  }
}

/**
 * Send an outbound message via Meta WhatsApp Cloud API (Graph API)
 */
export { sendTextMessage, sendTemplateMessage, getCloudApiStatus };
export async function sendMetaWhatsAppMessage(to, text) {
  return await sendTextMessage(to, text);
}

