import mongoose from 'mongoose';

const waSessionSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  data: { type: String, required: true }
}, {
  timestamps: true
});

export const WASession = mongoose.models.WASession || mongoose.model('WASession', waSessionSchema);
