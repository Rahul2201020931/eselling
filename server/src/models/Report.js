import mongoose from 'mongoose';
import { REPORT_REASONS } from '../constants.js';

const reportSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    note: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open' },
  },
  { timestamps: true }
);

// One report per person per listing.
reportSchema.index({ listing: 1, reporter: 1 }, { unique: true });

export const Report = mongoose.model('Report', reportSchema);
