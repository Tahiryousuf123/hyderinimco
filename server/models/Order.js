import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  customerAddress: { type: String, required: true },
  karachiArea: { type: String, default: '' },
  deliveryCharges: { type: Number, default: 0 },
  items: { type: Array, default: [] },
  subtotal: { type: Number, required: true, default: 0 },
  totalAmount: { type: Number, required: true, default: 0 },
  paymentMethod: { type: String, default: 'COD' },
  paymentStatus: { type: String, default: 'Pending' },
  orderStatus: { type: String, default: 'Received' },
  notes: { type: String, default: '' }
}, {
  timestamps: true
});

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
