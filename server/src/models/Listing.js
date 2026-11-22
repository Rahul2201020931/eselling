import mongoose from 'mongoose';
import { CATEGORIES, CONDITIONS, PRICE_TYPES, PROVINCES } from '../constants.js';

const listingSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 4000, default: '' },
    category: { type: String, enum: CATEGORIES, required: true },
    subcategory: { type: String, trim: true, default: 'other' },
    price: { type: Number, required: true, min: 0 }, // NPR
    priceType: { type: String, enum: PRICE_TYPES, default: 'fixed' },
    condition: { type: String, enum: CONDITIONS, default: 'used' },
    images: {
      type: [{ url: String, publicId: String, _id: false }],
      validate: [(v) => v.length <= 8, 'At most 8 images'],
      default: [],
    },
    location: {
      province: { type: String, enum: PROVINCES },
      district: { type: String, required: true, trim: true },
      area: { type: String, trim: true },
    },
    // Optional map pin: GeoJSON point, [longitude, latitude].
    coordinates: {
      type: { type: String, enum: ['Point'] },
      // default: undefined stops Mongoose from storing an empty array, which breaks the geo index
      coordinates: { type: [Number], default: undefined },
    },
    // Category-specific fields, checked against CATEGORY_TREE before saving.
    attributes: { type: mongoose.Schema.Types.Mixed, default: {} },
    // false = chat only: the phone number is never shown for this ad.
    showPhone: { type: Boolean, default: true },
    // pending = waiting for an admin; inactive = hidden by the seller.
    status: { type: String, enum: ['pending', 'active', 'inactive', 'sold', 'removed'], default: 'active' },
    moderationNote: { type: String, trim: true, maxlength: 300 },
    views: { type: Number, default: 0 },
    expiresAt: { type: Date },
    refreshedAt: { type: Date }, // newest-first sorting uses this, so renewing bumps the ad to the top
    lastRenewedAt: { type: Date },
  },
  { timestamps: true }
);

listingSchema.index({ title: 'text', description: 'text' });
listingSchema.index({ status: 1, category: 1, 'location.district': 1, price: 1, refreshedAt: -1 });
listingSchema.index({ coordinates: '2dsphere' }, { sparse: true });

export const Listing = mongoose.model('Listing', listingSchema);

// Public statuses a buyer can see: active and not past its expiry date.
export function liveFilter(now = new Date()) {
  return {
    status: 'active',
    $or: [{ expiresAt: { $gt: now } }, { expiresAt: { $exists: false } }],
  };
}

export function isExpired(listing, now = new Date()) {
  return listing.status === 'active' && listing.expiresAt && listing.expiresAt <= now;
}
