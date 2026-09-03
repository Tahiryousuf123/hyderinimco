import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  nameUrdu: { type: String, default: '' },
  category: { type: String, required: true, index: true },
  categoryLabel: { type: String, default: 'SAMOSA' },
  categoryLabelUrdu: { type: String, default: 'سموسہ' },
  packQuantity: { type: String, default: '12 pcs' },
  packQuantityUrdu: { type: String, default: '۱۲ عدد' },
  price: { type: Number, required: true, default: 0 },
  rating: { type: Number, default: 5.0 },
  reviewCount: { type: Number, default: 1 },
  image: { type: String, default: '' },
  badge: { type: String, default: '' },
  badgeUrdu: { type: String, default: '' },
  description: { type: String, default: '' },
  descriptionUrdu: { type: String, default: '' },
  itemsList: { type: [String], default: [] },
  isAvailable: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },
  isDeal: { type: Boolean, default: false },
  dealItems: { type: [String], default: [] }
}, {
  timestamps: true
});

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
