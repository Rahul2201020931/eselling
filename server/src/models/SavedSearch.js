import mongoose from 'mongoose';

const savedSearchSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, trim: true, maxlength: 100, required: true },
    // The filters exactly as the search page uses them, e.g. { q: 'iphone', category: 'electronics' }.
    params: { type: mongoose.Schema.Types.Mixed, default: {} },
    alerts: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const SavedSearch = mongoose.model('SavedSearch', savedSearchSchema);
