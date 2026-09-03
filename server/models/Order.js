import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  orderRef: { type: String, index: true },
  createdAt: { type: Date },
  formattedDate: { type: String, default: '' },
  customer: { type: mongoose.Schema.Types.Mixed, default: {} },
  items: { type: Array, default: [] },
  subtotal: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  paymentMethod: { type: String, default: 'bank_transfer' },
  paymentDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, default: 'pending_verification' },
  notes: { type: String, default: '' }
}, { timestamps: true, strict: false });

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
