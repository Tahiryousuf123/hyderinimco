import mongoose from 'mongoose';

const productImageSchema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true, index: true },
  contentType: { type: String, required: true, default: 'image/jpeg' },
  data: { type: Buffer, required: true },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const ProductImage = mongoose.models.ProductImage || mongoose.model('ProductImage', productImageSchema);
