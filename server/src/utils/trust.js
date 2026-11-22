import { Listing } from '../models/Listing.js';
import { Review } from '../models/Review.js';

const DAY = 86400000;

// Numbers shown on a seller's public profile, and the trusted-seller badge.
// Trusted = account at least 30 days old, has a phone number, at least 2 sold ads,
// and (if anyone reviewed them) an average rating of 4 or more.
export async function sellerStats(user) {
  const [activeAds, soldAds, ratingAgg] = await Promise.all([
    Listing.countDocuments({ seller: user._id, status: 'active' }),
    Listing.countDocuments({ seller: user._id, status: 'sold' }),
    Review.aggregate([
      { $match: { seller: user._id } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]),
  ]);
  const avgRating = ratingAgg[0] ? Math.round(ratingAgg[0].avg * 10) / 10 : null;
  const reviewCount = ratingAgg[0]?.count ?? 0;
  const oldEnough = Date.now() - new Date(user.createdAt).getTime() >= 30 * DAY;
  const trusted = oldEnough && !!user.phone && soldAds >= 2 && (reviewCount === 0 || avgRating >= 4);
  return {
    activeAds,
    soldAds,
    avgRating,
    reviewCount,
    trusted,
    badges: {
      phoneAdded: !!user.phone,
      emailAdded: !!user.email,
      google: !!user.googleId,
      facebook: !!user.facebookId,
    },
  };
}

// Phrases and keywords helpers.
export function findKeyword(text, words) {
  const t = ` ${String(text).toLowerCase()} `;
  return words.find((w) => new RegExp(`\\b${w.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&')}\\b`).test(t));
}
