import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { handleWhatsAppIncoming } from './whatsapp_ai.js';
import { WASession } from './models/WASession.js';
import { isDBConnected } from './db.js';

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
      for (const doc of docs) {
        const filepath = path.join(AUTH_DIR, doc.key);
        fs.writeFileSync(filepath, doc.data, 'utf8');
      }
      console.log(`✅ [WhatsApp Auth Sync] Successfully restored ${docs.length} session key files from MongoDB Atlas.`);
      return true;
    }
  } catch (e) {
    console.error('[WhatsApp Auth Sync] Warning: Failed to restore session from MongoDB Atlas:', e.message);
  }
  return false;
}

// Backup Local WhatsApp Session Files from Local Ephemeral Disk to MongoDB Atlas
async function backupAuthToDB() {
  if (!isDBConnected() || !fs.existsSync(AUTH_DIR)) return;
  try {
    const files = fs.readdirSync(AUTH_DIR);
    for (const file of files) {
      const filepath = path.join(AUTH_DIR, file);
      if (fs.statSync(filepath).isFile()) {
        const content = fs.readFileSync(filepath, 'utf8');
        await WASession.updateOne({ key: file }, { $set: { key: file, data: content } }, { upsert: true });
      }
    }
    console.log(`💾 [WhatsApp Auth Sync] Successfully backed up ${files.length} auth key files to MongoDB Atlas.`);
  } catch (e) {
    console.error('[WhatsApp Auth Sync] Warning: Failed to backup session to MongoDB Atlas:', e.message);
  }
}

export async function startWhatsAppService() {
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
      browser: ['Hyderi Nimco & Frozen', 'Chrome', '1.0.0'],
      syncFullHistory: false,
      connectTimeoutMs: 30000,
      keepAliveIntervalMs: 15000
    });

    sock.ev.on('creds.update', async () => {
      await saveCreds();
      backupAuthToDB().catch(() => {});
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
          console.log('⚠️ [WhatsApp Service] Device unlinked by phone/user. Wiping session keys...');
          try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (e) {}
          if (isDBConnected()) {
            try { await WASession.deleteMany({}); } catch (e) {}
          }
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
        backupAuthToDB().catch(() => {});
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
          // Generate Intelligent Response via Gemini AI Agent (function calling + MongoDB tools)
          const aiResponse = await handleWhatsAppIncoming(customerPhone, text, messageId);

          // Skip sending if duplicate message was detected
          if (aiResponse._duplicate) {
            console.log(`⚡ [WhatsApp AI] Duplicate message skipped for ${customerPhone}`);
            continue;
          }

          const replyText = aiResponse?.message || '';
          if (!replyText) continue;

          // Send auto-reply back to the customer on WhatsApp
          await sock.sendMessage(remoteJid, { text: replyText });
          console.log(`🤖 [WhatsApp AI] Auto-replied to ${customerPhone}`);
        } catch (sendErr) {
          console.error(`❌ Failed to send WhatsApp auto-reply to ${remoteJid}:`, sendErr);
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
        `Umeed hai aap khairiyat se honge. Aap ne thodi der pehle Hyderi Nimco & Frozen se Samosas & Deals ke bare me maloomat li thi.\n\n` +
        `🥟 **Kya aap ko aaj ka fresh order book karwane me koi madad chahiye?**\n` +
        `Karachi ke tamam areas me fresh express delivery dastiyab hai!\n\n` +
        `🛍️ Order karne ke liye hamari website visit karein: https://hyderinimco-frozen.com\n` +
        `ya hamen yahan WhatsApp par reply farmaiye! 🤝\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🥟 *HYDERI NIMCO & FROZEN*\n` +
        `📍 North Nazimabad, Karachi • Since 1970`;

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
  return {
    status: connectionStatus,
    qr: latestQR,
    phone: connectedPhone,
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
  if (!sock || connectionStatus !== 'connected') {
    return { success: false, error: 'WhatsApp Service is not connected. Please scan QR code first in WhatsApp tab.' };
  }

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return { success: false, error: 'No customer phone numbers provided for broadcast.' };
  }

  let sentCount = 0;
  let failedCount = 0;

  for (const rawPhone of recipients) {
    try {
      let phone = String(rawPhone).replace(/[^0-9]/g, '');
      if (!phone) continue;
      if (phone.startsWith('03')) phone = '92' + phone.slice(1);
      else if (!phone.startsWith('92')) phone = '92' + phone;

      const jid = `${phone}@s.whatsapp.net`;
      if (imageUrl) {
        await sock.sendMessage(jid, {
          image: { url: imageUrl },
          caption: messageText
        });
      } else {
        await sock.sendMessage(jid, { text: messageText });
      }
      sentCount++;
      // Safe delay between messages to prevent spam flag
      await new Promise(r => setTimeout(r, 1200));
    } catch (err) {
      console.error(`Broadcast error for phone ${rawPhone}:`, err);
      failedCount++;
    }
  }

  return { success: true, sentCount, failedCount, total: recipients.length };
}

export async function notifyOwnerNewOrder(order) {
  if (!sock || connectionStatus !== 'connected') {
    console.log('⚠️ WhatsApp service not connected, skipping direct socket dispatch to owner.');
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
    (order.notes ? `📝 *Customer Notes:* ${order.notes}\n` : '') +
    `\n⏰ *Time:* ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}`;

  const recipientPhones = ['923362438422', '923252747343'];
  for (const phone of recipientPhones) {
    try {
      const jid = `${phone}@s.whatsapp.net`;
      await sock.sendMessage(jid, { text });
      console.log(`✅ [WhatsApp Service] Direct order alert sent to shop owner ${phone}!`);
    } catch (err) {
      console.error(`Failed to send order notification to ${phone}:`, err);
    }
  }
}
