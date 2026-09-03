import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  value: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true, strict: false });

export const Setting = mongoose.models.Setting || mongoose.model('Setting', settingSchema);
