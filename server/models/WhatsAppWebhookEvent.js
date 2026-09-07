import mongoose from 'mongoose';

const whatsAppWebhookEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true, index: true },
  eventType: { type: String, required: true, index: true },
  status: { 
    type: String, 
    enum: ['processed', 'duplicate', 'failed'], 
    default: 'processed',
    index: true 
  },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  error: { type: String, default: '' },
  receivedAt: { type: Date, default: Date.now, index: true }
}, { 
  timestamps: true,
  strict: false 
});

// Auto-expire raw webhook logs after 30 days to avoid boundless database growth
whatsAppWebhookEventSchema.index({ receivedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const WhatsAppWebhookEvent = mongoose.models.WhatsAppWebhookEvent || 
  mongoose.model('WhatsAppWebhookEvent', whatsAppWebhookEventSchema);
