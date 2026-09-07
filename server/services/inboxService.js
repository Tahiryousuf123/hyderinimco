import path from 'path';
import { fileURLToPath } from 'url';
import { WhatsAppConversation } from '../models/WhatsAppConversation.js';
import { WhatsAppMessage } from '../models/WhatsAppMessage.js';
import { WhatsAppCustomer } from '../models/WhatsAppCustomer.js';
import { WhatsAppWebhookEvent } from '../models/WhatsAppWebhookEvent.js';
import { Order } from '../models/Order.js';
import { isDBConnected } from '../db.js';
import {
  normalizePhoneNumber,
  sendTextMessage,
  sendMediaMessage,
  sendTypingIndicator,
  downloadMetaMedia,
  isCustomerServiceWindowOpen
} from './whatsappCloudApi.js';
import { handleWhatsAppIncoming } from '../whatsapp_ai.js';
import { isAiAutoReplyEnabled } from '../whatsapp_service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_WHATSAPP_DIR = path.join(__dirname, '..', 'uploads', 'whatsapp');

// -----------------------------------------------------------------------------
// REAL-TIME SERVER-SENT EVENTS (SSE) BROADCASTER
// -----------------------------------------------------------------------------
const sseClients = new Set();

// Send 25-second keep-alive heartbeats to keep SSE connections open through Render/proxies
setInterval(() => {
  const pingPayload = `event: ping\ndata: {"time":"${new Date().toISOString()}"}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(pingPayload);
    } catch (e) {
      sseClients.delete(res);
    }
  }
}, 25000).unref();

export function registerSSEClient(res) {
  sseClients.add(res);
  res.on('close', () => {
    sseClients.delete(res);
  });
}

export function broadcastSSE(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch (e) {
      sseClients.delete(res);
    }
  }
}

// -----------------------------------------------------------------------------
// CONCURRENCY LOCK FOR AI AUTO-REPLY (Prevents race conditions on rapid chats)
// -----------------------------------------------------------------------------
const activeAiLocks = new Set();

// -----------------------------------------------------------------------------
// INCOMING WEBHOOK PIPELINE (Strict Ordered Execution)
// -----------------------------------------------------------------------------
export async function processIncomingWebhook(rawPayload) {
  let entry = rawPayload.entry?.[0];
  let change = entry?.changes?.[0]?.value;

  // Resilient fallback for direct simulation or test payloads
  if (!change) {
    if (rawPayload.from || rawPayload.From) {
      const from = rawPayload.from || rawPayload.From;
      const text = rawPayload.message || rawPayload.Body || rawPayload.text || '';
      const id = rawPayload.messageId || rawPayload.MessageSid || rawPayload.id || `sim_${Date.now()}`;
      const type = rawPayload.type || (rawPayload.image ? 'image' : rawPayload.document ? 'document' : 'text');
      change = {
        messaging_product: 'whatsapp',
        metadata: { phone_number_id: '1288268431037180' },
        contacts: [{ profile: { name: rawPayload.customerName || 'WhatsApp Customer' }, wa_id: from }],
        messages: [{
          from,
          id,
          timestamp: String(Math.floor(Date.now() / 1000)),
          type,
          text: { body: text },
          image: rawPayload.image,
          document: rawPayload.document,
          audio: rawPayload.audio,
          video: rawPayload.video
        }]
      };
    } else if (rawPayload.status && (rawPayload.id || rawPayload.messageId)) {
      change = {
        messaging_product: 'whatsapp',
        statuses: [{
          id: rawPayload.id || rawPayload.messageId,
          status: rawPayload.status,
          timestamp: String(Math.floor(Date.now() / 1000)),
          recipient_id: rawPayload.recipient_id || rawPayload.from || ''
        }]
      };
    }
  }

  if (!change) return { status: 'NO_VALUE' };

  // 1. Process Status Updates (sent, delivered, read, failed)
  if (change.statuses && change.statuses.length > 0) {
    for (const statusObj of change.statuses) {
      await processStatusUpdate(statusObj);
    }
    return { status: 'STATUSES_PROCESSED' };
  }

  // 2. Process Inbound Messages
  if (change.messages && change.messages.length > 0) {
    for (const msgObj of change.messages) {
      await processInboundMessage(msgObj, change);
    }
    return { status: 'MESSAGES_PROCESSED' };
  }

  return { status: 'UNHANDLED_EVENT' };
}

/**
 * Handle delivery status receipts (sent, delivered, read, failed)
 */
async function processStatusUpdate(statusObj) {
  const wamid = statusObj.id;
  const status = statusObj.status; // 'sent' | 'delivered' | 'read' | 'failed'
  if (!wamid || !isDBConnected()) return;

  try {
    const errorDetails = statusObj.errors?.[0];
    const updateFields = { status };
    if (errorDetails) {
      updateFields.errorCode = String(errorDetails.code || '');
      updateFields.errorMessage = errorDetails.title || errorDetails.message || '';
    }

    const updatedMsg = await WhatsAppMessage.findOneAndUpdate(
      { id: wamid },
      { $set: updateFields },
      { new: true, lean: true }
    );

    if (updatedMsg) {
      // Update lastMessage status in conversation if matching
      await WhatsAppConversation.updateOne(
        { id: updatedMsg.conversationId, 'lastMessage.id': wamid },
        { $set: { 'lastMessage.status': status } }
      );

      broadcastSSE('message_status', {
        id: wamid,
        conversationId: updatedMsg.conversationId,
        status,
        errorCode: updateFields.errorCode,
        errorMessage: updateFields.errorMessage
      });
    }
  } catch (err) {
    console.error('[Inbox] Error updating message status:', err.message);
  }
}

/**
 * Handle incoming customer message with strict idempotency and ordered persistence
 */
async function processInboundMessage(m, change) {
  const messageId = m.id;
  const rawSender = m.from;
  const cleanPhone = normalizePhoneNumber(rawSender);
  if (!messageId || !cleanPhone) return;

  // STEP 1: Idempotency Check via WhatsAppWebhookEvent
  if (isDBConnected()) {
    try {
      const existingEvent = await WhatsAppWebhookEvent.findOne({ eventId: messageId }).lean();
      if (existingEvent) {
        console.log(`⚡ [Inbox Idempotency] Skipping duplicate webhook message: ${messageId}`);
        return;
      }
      // Record webhook event receipt
      await WhatsAppWebhookEvent.create({
        eventId: messageId,
        eventType: 'message',
        status: 'processed',
        payload: m
      });
    } catch (err) {
      if (err.code === 11000) {
        console.log(`⚡ [Inbox Idempotency] Duplicate key detected for ${messageId}, skipping.`);
        return;
      }
      console.warn('[Inbox] Webhook event logging warning:', err.message);
    }
  }

  // STEP 2: Extract Message Body & Media
  const messageType = m.type || 'text';
  let messageText = '';
  let mediaUrl = '';
  let mediaMimeType = '';
  let mediaFilename = '';

  if (messageType === 'text') {
    messageText = m.text?.body || '';
  } else if (messageType === 'interactive') {
    messageText = m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || '';
  } else if (messageType === 'button') {
    messageText = m.button?.text || '';
  } else if (messageType === 'image') {
    messageText = m.image?.caption || '';
    mediaMimeType = m.image?.mime_type || 'image/jpeg';
    const downloaded = await downloadMetaMedia(m.image?.id, UPLOADS_WHATSAPP_DIR);
    if (downloaded) {
      mediaUrl = downloaded.publicUrl;
      mediaFilename = downloaded.filename;
    }
  } else if (messageType === 'document') {
    messageText = m.document?.caption || '';
    mediaFilename = m.document?.filename || 'document.pdf';
    mediaMimeType = m.document?.mime_type || 'application/pdf';
    const downloaded = await downloadMetaMedia(m.document?.id, UPLOADS_WHATSAPP_DIR);
    if (downloaded) {
      mediaUrl = downloaded.publicUrl;
    }
  } else if (messageType === 'audio') {
    mediaMimeType = m.audio?.mime_type || 'audio/ogg';
    const downloaded = await downloadMetaMedia(m.audio?.id, UPLOADS_WHATSAPP_DIR);
    if (downloaded) mediaUrl = downloaded.publicUrl;
  } else if (messageType === 'video') {
    messageText = m.video?.caption || '';
    mediaMimeType = m.video?.mime_type || 'video/mp4';
    const downloaded = await downloadMetaMedia(m.video?.id, UPLOADS_WHATSAPP_DIR);
    if (downloaded) mediaUrl = downloaded.publicUrl;
  }

  const customerName = change.contacts?.[0]?.profile?.name || 'WhatsApp Customer';
  const conversationId = `conv-${cleanPhone}`;
  const now = new Date();

  // STEP 3: Persist Customer Profile
  if (isDBConnected()) {
    try {
      await WhatsAppCustomer.findOneAndUpdate(
        { phone: cleanPhone },
        {
          $set: {
            name: customerName,
            lastContactAt: now
          },
          $setOnInsert: {
            firstContactAt: now,
            labels: [],
            notes: ''
          },
          $inc: { totalMessages: 1 }
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.warn('[Inbox] Customer profile upsert warning:', err.message);
    }
  }

  // STEP 4: Persist Conversation State & Unread Counter
  let conversation = { id: conversationId, automationEnabled: true, unreadCount: 1 };
  if (isDBConnected()) {
    try {
      conversation = await WhatsAppConversation.findOneAndUpdate(
        { id: conversationId },
        {
          $set: {
            customerPhone: cleanPhone,
            customerName: customerName,
            status: 'open',
            lastCustomerMessageAt: now,
            'lastMessage.id': messageId,
            'lastMessage.text': messageText || (mediaUrl ? `[${messageType.toUpperCase()}]` : ''),
            'lastMessage.sender': 'customer',
            'lastMessage.senderName': customerName,
            'lastMessage.type': messageType,
            'lastMessage.status': 'delivered',
            'lastMessage.timestamp': now
          },
          $inc: { unreadCount: 1 }
        },
        { upsert: true, new: true, lean: true }
      );
    } catch (err) {
      console.error('[Inbox] Conversation upsert error:', err.message);
      conversation = { id: conversationId, automationEnabled: true, unreadCount: 1 };
    }
  }

  // STEP 5: Persist Incoming Message
  if (isDBConnected()) {
    try {
      await WhatsAppMessage.create({
        id: messageId,
        conversationId: conversationId,
        customerPhone: cleanPhone,
        sender: 'customer',
        senderName: customerName,
        type: messageType,
        text: messageText,
        mediaUrl: mediaUrl,
        mediaMimeType: mediaMimeType,
        mediaFilename: mediaFilename,
        status: 'delivered',
        timestamp: now,
        rawPayload: m
      });
    } catch (err) {
      console.error('[Inbox] Inbound message persist error:', err.message);
    }
  }

  // STEP 6: Broadcast Live SSE Event to Open Dashboards
  broadcastSSE('new_message', {
    id: messageId,
    conversationId: conversationId,
    customerPhone: cleanPhone,
    sender: 'customer',
    senderName: customerName,
    type: messageType,
    text: messageText,
    mediaUrl: mediaUrl,
    timestamp: now.toISOString()
  });

  broadcastSSE('conversation_updated', {
    id: conversationId,
    customerPhone: cleanPhone,
    customerName: customerName,
    status: 'open',
    unreadCount: conversation.unreadCount || 1,
    lastMessage: conversation.lastMessage
  });

  // Trigger typing indicator and read receipt on WhatsApp
  sendTypingIndicator(messageId).catch(() => {});

  // STEP 7: Automation Decision (Honor Global & Per-Chat AI Toggles)
  const isGlobalAiOn = isAiAutoReplyEnabled();
  const isChatAiOn = conversation.automationEnabled !== false;

  if (!isGlobalAiOn || !isChatAiOn) {
    console.log(`ℹ️ [Inbox Automation] AI Auto-Reply skipped for ${cleanPhone} (Global: ${isGlobalAiOn}, Chat: ${isChatAiOn})`);
    return;
  }

  // If message has no readable text (e.g. bare sticker or audio), send brief text notice
  if (!messageText.trim()) {
    const politeNotice = 
      `Assalam o Alaikum! 👋🥟\n\n` +
      `Shukriya rabta karne ka! Humari automated AI abhi sirf text messages samajh sakti hai.\n\n` +
      `Baraye meherbani apna sawal ya order likh kar bhejein: 0336-2438422\n\n` +
      `*Hyderi Nimco & Frozen (Since 1970)*`;
    const replyRes = await sendTextMessage(cleanPhone, politeNotice);
    if (replyRes.success) {
      await recordBotOutgoingMessage(conversationId, cleanPhone, replyRes.messageId, politeNotice);
    }
    return;
  }

  // STEP 8: Concurrency Lock — Ensure only one AI reply runs per conversation at a time
  if (activeAiLocks.has(cleanPhone)) {
    console.log(`⏳ [Inbox Concurrency] AI processing already active for ${cleanPhone}, skipping duplicate pass.`);
    return;
  }
  activeAiLocks.add(cleanPhone);

  // STEP 9: Generate AI Response and Send
  (async () => {
    try {
      // Natural organic delay (2.0s to 3.5s)
      const humanDelay = Math.min(3500, Math.max(2000, (messageText.length || 10) * 35));
      await new Promise(r => setTimeout(r, humanDelay));

      const aiResult = await handleWhatsAppIncoming(cleanPhone, messageText, messageId);
      if (aiResult?.message) {
        const sendRes = await sendTextMessage(cleanPhone, aiResult.message);
        if (sendRes.success) {
          console.log(`🤖 [Inbox AI] Sent automated reply to ${cleanPhone} (wamid: ${sendRes.messageId})`);
          await recordBotOutgoingMessage(conversationId, cleanPhone, sendRes.messageId, aiResult.message);
        } else {
          console.warn(`⚠️ [Inbox AI] Send failure to ${cleanPhone}:`, sendRes.error);
        }
      }
    } catch (err) {
      console.error('[Inbox AI Async Error]:', err.message);
    } finally {
      activeAiLocks.delete(cleanPhone);
    }
  })();
}

/**
 * Record outgoing automated bot message in database and broadcast via SSE
 */
async function recordBotOutgoingMessage(conversationId, cleanPhone, messageId, text) {
  const now = new Date();
  const wamid = messageId || `bot_${Date.now()}`;

  if (isDBConnected()) {
    try {
      await WhatsAppMessage.create({
        id: wamid,
        conversationId,
        customerPhone: cleanPhone,
        sender: 'bot',
        senderName: 'AI Sales Agent',
        type: 'text',
        text,
        status: 'sent',
        timestamp: now
      });

      await WhatsAppConversation.updateOne(
        { id: conversationId },
        {
          $set: {
            'lastMessage.id': wamid,
            'lastMessage.text': text,
            'lastMessage.sender': 'bot',
            'lastMessage.senderName': 'AI Sales Agent',
            'lastMessage.type': 'text',
            'lastMessage.status': 'sent',
            'lastMessage.timestamp': now
          }
        }
      );
    } catch (err) {
      console.error('[Inbox] Error persisting bot message:', err.message);
    }
  }

  broadcastSSE('new_message', {
    id: wamid,
    conversationId,
    customerPhone: cleanPhone,
    sender: 'bot',
    senderName: 'AI Sales Agent',
    type: 'text',
    text,
    timestamp: now.toISOString()
  });
}

// -----------------------------------------------------------------------------
// MANUAL AGENT OUTBOUND REPLIES
// -----------------------------------------------------------------------------
export async function sendManualAgentMessage({
  conversationId,
  customerPhone,
  text,
  mediaType = null,
  mediaUrl = null,
  agentName = 'Store Manager'
}) {
  const cleanPhone = normalizePhoneNumber(customerPhone);
  if (!cleanPhone) throw new Error('Invalid customer phone number.');

  // Find conversation to verify customer service window
  let conversation = null;
  if (isDBConnected()) {
    conversation = await WhatsAppConversation.findOne({ id: conversationId }).lean();
  }
  const isWindowOpen = isCustomerServiceWindowOpen(conversation?.lastCustomerMessageAt || new Date());

  if (!isWindowOpen) {
    return {
      success: false,
      windowExpired: true,
      error: 'The 24-hour Meta customer service window has expired. Customer must message first, or an approved Meta template must be used.'
    };
  }

  let sendResult;
  if (mediaType && mediaUrl) {
    sendResult = await sendMediaMessage(cleanPhone, mediaType, mediaUrl, text || '');
  } else {
    if (!text || !text.trim()) throw new Error('Message text cannot be empty.');
    sendResult = await sendTextMessage(cleanPhone, text);
  }

  if (!sendResult.success) {
    return { success: false, error: sendResult.error, code: sendResult.code };
  }

  const wamid = sendResult.messageId;
  const now = new Date();

  // Persist outgoing agent message
  let msgDoc = {
    id: wamid,
    conversationId,
    customerPhone: cleanPhone,
    sender: 'agent',
    senderName: agentName,
    type: mediaType || 'text',
    text: text || '',
    mediaUrl: mediaUrl || '',
    status: 'sent',
    timestamp: now
  };

  if (isDBConnected()) {
    try {
      msgDoc = await WhatsAppMessage.create({
        id: wamid,
        conversationId,
        customerPhone: cleanPhone,
        sender: 'agent',
        senderName: agentName,
        type: mediaType || 'text',
        text: text || '',
        mediaUrl: mediaUrl || '',
        status: 'sent',
        timestamp: now
      });

      // Update conversation: set lastMessage, reset unreadCount to 0
      await WhatsAppConversation.updateOne(
        { id: conversationId },
        {
          $set: {
            unreadCount: 0,
            'lastMessage.id': wamid,
            'lastMessage.text': text || (mediaUrl ? `[${mediaType?.toUpperCase()}]` : ''),
            'lastMessage.sender': 'agent',
            'lastMessage.senderName': agentName,
            'lastMessage.type': mediaType || 'text',
            'lastMessage.status': 'sent',
            'lastMessage.timestamp': now
          }
        }
      );
    } catch (err) {
      console.error('[Inbox] Error updating conversation for agent outbound:', err.message);
    }
  }

  broadcastSSE('new_message', {
    id: wamid,
    conversationId,
    customerPhone: cleanPhone,
    sender: 'agent',
    senderName: agentName,
    type: mediaType || 'text',
    text: text || '',
    mediaUrl: mediaUrl || '',
    timestamp: now.toISOString()
  });

  return { success: true, messageId: wamid, message: msgDoc };
}

// -----------------------------------------------------------------------------
// INBOX MANAGEMENT QUERIES & MUTATIONS (Connection-Safe)
// -----------------------------------------------------------------------------
export async function getInboxStats() {
  if (!isDBConnected()) {
    return {
      totalConversations: 0,
      unreadMessages: 0,
      openConversations: 0,
      resolvedConversations: 0,
      todayMessages: 0
    };
  }

  const [totalConversations, unreadAgg, openCount, resolvedCount, todayMessages] = await Promise.all([
    WhatsAppConversation.countDocuments(),
    WhatsAppConversation.aggregate([{ $group: { _id: null, totalUnread: { $sum: '$unreadCount' } } }]),
    WhatsAppConversation.countDocuments({ status: 'open' }),
    WhatsAppConversation.countDocuments({ status: 'resolved' }),
    WhatsAppMessage.countDocuments({ timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
  ]);

  return {
    totalConversations,
    unreadMessages: unreadAgg[0]?.totalUnread || 0,
    openConversations: openCount,
    resolvedConversations: resolvedCount,
    todayMessages
  };
}

export async function listConversations({ status = 'all', search = '', limit = 50, page = 1 }) {
  if (!isDBConnected()) {
    return {
      conversations: [],
      total: 0,
      page,
      totalPages: 1
    };
  }

  const query = {};
  if (status && status !== 'all') {
    if (status === 'unread') {
      query.unreadCount = { $gt: 0 };
    } else {
      query.status = status;
    }
  }

  if (search && search.trim()) {
    const q = search.trim();
    query.$or = [
      { customerPhone: { $regex: q, $options: 'i' } },
      { customerName: { $regex: q, $options: 'i' } },
      { 'lastMessage.text': { $regex: q, $options: 'i' } }
    ];
  }

  const skip = (Math.max(1, page) - 1) * limit;
  const [items, total] = await Promise.all([
    WhatsAppConversation.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    WhatsAppConversation.countDocuments(query)
  ]);

  return {
    conversations: items,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
}

export async function getConversationDetails(conversationId) {
  if (!isDBConnected()) {
    return {
      conversation: { id: conversationId, customerPhone: conversationId.replace('conv-', ''), status: 'open', automationEnabled: true },
      messages: [],
      customer: { phone: conversationId.replace('conv-', ''), name: 'Customer' },
      orders: [],
      isWindowOpen: true
    };
  }

  const conversation = await WhatsAppConversation.findOne({ id: conversationId }).lean();
  if (!conversation) return null;

  const [messages, customer, orders] = await Promise.all([
    WhatsAppMessage.find({ conversationId })
      .sort({ timestamp: 1 })
      .limit(200)
      .lean(),
    WhatsAppCustomer.findOne({ phone: conversation.customerPhone }).lean(),
    // Linked website orders matching this customer's phone number
    Order.find({
      $or: [
        { 'customer.phone': conversation.customerPhone },
        { 'customer.phone': '0' + conversation.customerPhone.slice(2) },
        { 'customer.phone': conversation.customerPhone.replace(/^92/, '0') }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()
  ]);

  const windowOpen = isCustomerServiceWindowOpen(conversation.lastCustomerMessageAt);

  return {
    conversation,
    messages,
    customer: customer || { phone: conversation.customerPhone, name: conversation.customerName },
    orders: orders || [],
    isWindowOpen: windowOpen
  };
}

export async function markConversationAsRead(conversationId) {
  if (isDBConnected()) {
    await WhatsAppConversation.updateOne(
      { id: conversationId },
      { $set: { unreadCount: 0 } }
    );
  }
  broadcastSSE('unread_count_updated', { conversationId, unreadCount: 0 });
  return { success: true };
}

export async function updateConversationMetadata(conversationId, { status, automationEnabled, labels }) {
  const update = {};
  if (status) update.status = status;
  if (typeof automationEnabled === 'boolean') update.automationEnabled = automationEnabled;
  if (Array.isArray(labels)) update.labels = labels;

  let updated = { id: conversationId, status: status || 'open', automationEnabled: automationEnabled !== false, labels: labels || [] };
  if (isDBConnected()) {
    const doc = await WhatsAppConversation.findOneAndUpdate(
      { id: conversationId },
      { $set: update },
      { new: true, lean: true }
    );
    if (doc) updated = doc;
  }

  broadcastSSE('conversation_updated', {
    id: conversationId,
    status: updated.status,
    automationEnabled: updated.automationEnabled,
    labels: updated.labels
  });

  return { success: true, conversation: updated };
}

export async function addConversationInternalNote(conversationId, text, author = 'Staff') {
  if (!text || !text.trim()) throw new Error('Note text cannot be empty.');
  const newNote = {
    text: text.trim(),
    author,
    createdAt: new Date()
  };

  let internalNotes = [newNote];
  if (isDBConnected()) {
    const updated = await WhatsAppConversation.findOneAndUpdate(
      { id: conversationId },
      { $push: { internalNotes: newNote } },
      { new: true, lean: true }
    );
    if (updated?.internalNotes) internalNotes = updated.internalNotes;
  }

  return { success: true, note: newNote, internalNotes };
}
