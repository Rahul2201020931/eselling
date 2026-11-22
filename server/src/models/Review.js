import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

// One review per person per seller; reviewing again edits it.
reviewSchema.index({ seller: 1, reviewer: 1 }, { unique: true });

export const Review = mongoose.model('Review', reviewSchema);
