import mongoose from 'mongoose';

const whatsAppConversationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  customerPhone: { type: String, required: true, index: true },
  customerName: { type: String, default: 'Customer' },
  status: { 
    type: String, 
    enum: ['new', 'open', 'pending', 'resolved'], 
    default: 'new',
    index: true 
  },
  unreadCount: { type: Number, default: 0, index: true },
  lastMessage: {
    id: { type: String, default: '' },
    text: { type: String, default: '' },
    sender: { type: String, enum: ['customer', 'bot', 'agent'], default: 'customer' },
    senderName: { type: String, default: '' },
    type: { type: String, default: 'text' },
    status: { type: String, default: 'delivered' },
    timestamp: { type: Date, default: Date.now }
  },
  lastCustomerMessageAt: { type: Date, default: Date.now, index: true },
  automationEnabled: { type: Boolean, default: true, index: true },
  assignedTo: { type: String, default: 'unassigned' },
  labels: { type: [String], default: [] },
  internalNotes: [{
    text: { type: String, required: true },
    author: { type: String, default: 'Staff' },
    createdAt: { type: Date, default: Date.now }
  }]
}, { 
  timestamps: true,
  strict: false 
});

// Composite and sorting indexes for fast inbox queries
whatsAppConversationSchema.index({ customerPhone: 1, updatedAt: -1 });
whatsAppConversationSchema.index({ status: 1, updatedAt: -1 });
whatsAppConversationSchema.index({ updatedAt: -1 });

export const WhatsAppConversation = mongoose.models.WhatsAppConversation || 
  mongoose.model('WhatsAppConversation', whatsAppConversationSchema);
