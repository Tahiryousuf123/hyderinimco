import mongoose from 'mongoose';

const whatsAppMessageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  conversationId: { type: String, required: true, index: true },
  customerPhone: { type: String, required: true, index: true },
  sender: { 
    type: String, 
    enum: ['customer', 'bot', 'agent'], 
    required: true, 
    index: true 
  },
  senderName: { type: String, default: '' },
  type: { 
    type: String, 
    enum: ['text', 'image', 'document', 'audio', 'video', 'interactive', 'template'], 
    default: 'text' 
  },
  text: { type: String, default: '' },
  mediaUrl: { type: String, default: '' },
  mediaMimeType: { type: String, default: '' },
  mediaFilename: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'], 
    default: 'sent',
    index: true 
  },
  errorCode: { type: String, default: '' },
  errorMessage: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now, index: true },
  rawPayload: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { 
  timestamps: true,
  strict: false 
});

// Composite indexes for fast chat history retrieval
whatsAppMessageSchema.index({ conversationId: 1, timestamp: 1 });
whatsAppMessageSchema.index({ customerPhone: 1, timestamp: -1 });

export const WhatsAppMessage = mongoose.models.WhatsAppMessage || 
  mongoose.model('WhatsAppMessage', whatsAppMessageSchema);
