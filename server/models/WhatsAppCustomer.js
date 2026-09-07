import mongoose from 'mongoose';

const whatsAppCustomerSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true, index: true },
  name: { type: String, default: 'Customer' },
  labels: { type: [String], default: [] },
  notes: { type: String, default: '' },
  firstContactAt: { type: Date, default: Date.now },
  lastContactAt: { type: Date, default: Date.now, index: true },
  totalMessages: { type: Number, default: 0 }
}, { 
  timestamps: true,
  strict: false 
});

whatsAppCustomerSchema.index({ lastContactAt: -1 });

export const WhatsAppCustomer = mongoose.models.WhatsAppCustomer || 
  mongoose.model('WhatsAppCustomer', whatsAppCustomerSchema);
