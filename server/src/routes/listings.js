import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Listing, isExpired, liveFilter } from '../models/Listing.js';
import { Report } from '../models/Report.js';
import { Favorite } from '../models/Favorite.js';
import { Conversation } from '../models/Conversation.js';
import { User } from '../models/User.js';
import { SavedSearch } from '../models/SavedSearch.js';
import { notify } from '../models/Notification.js';
import { isBlockedBetween } from '../models/Block.js';
import { requireAuth } from '../middleware/auth.js';
import { buildFilter, listingMatchesSearch, searchSchema } from '../utils/search.js';
import { findKeyword, sellerStats } from '../utils/trust.js';
import {
  AD_LIFETIME_DAYS,
  CATEGORIES,
  CONDITIONS,
  DISTRICTS,
  MODERATION_KEYWORDS,
  PRICE_TYPES,
  PROVINCE_DISTRICTS,
  REPORT_REASONS,
  RENEW_EVERY_DAYS,
  cleanAttributes,
  isValidSubcategory,
} from '../constants.js';

const router = Router();
const DAY = 86400000;
const MAX_NEW_ADS_PER_DAY = 20;

const listingSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(4000).default(''),
  category: z.enum(CATEGORIES),
  subcategory: z.string().trim().max(40).default('other'),
  price: z.coerce.number().min(0),
  priceType: z.enum(PRICE_TYPES).default('fixed'),
  condition: z.enum(CONDITIONS).default('used'),
  images: z.array(z.object({ url: z.string().url(), publicId: z.string().optional() })).max(8).default([]),
  location: z.object({
    province: z.string().optional(),
    district: z.string().trim().min(2).max(60),
    area: z.string().trim().max(100).optional(),
  }),
  attributes: z.record(z.any()).default({}),
  showPhone: z.boolean().default(true),
  pin: z.object({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) }).nullish(),
});

const SORTS = {
  newest: { refreshedAt: -1, createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
};

// Check the pieces of a listing that depend on each other and return fields ready to save.
function prepareFields(data) {
  if (!isValidSubcategory(data.category, data.subcategory)) {
    const err = new Error('Pick a subcategory from the list');
    err.status = 400;
    throw err;
  }
  const district = DISTRICTS.find((d) => d.toLowerCase() === data.location.district.toLowerCase());
  if (!district) {
    const err = new Error('Pick a district from the list');
    err.status = 400;
    throw err;
  }
  const province = Object.keys(PROVINCE_DISTRICTS).find((p) => PROVINCE_DISTRICTS[p].includes(district));
  const fields = {
    title: data.title,
    description: data.description,
    category: data.category,
    subcategory: data.subcategory,
    price: data.price,
    priceType: data.priceType,
    condition: data.condition,
    images: data.images,
    location: { province, district, area: data.location.area },
    attributes: cleanAttributes(data.category, data.attributes),
    showPhone: data.showPhone,
  };
  // Pins are rounded to 3 decimals (about 100 m), so a seller's exact door is never shown.
  fields.coordinates = data.pin
    ? { type: 'Point', coordinates: [Math.round(data.pin.lng * 1000) / 1000, Math.round(data.pin.lat * 1000) / 1000] }
    : undefined;
  return fields;
}

// Ads containing risky words wait for an admin before going live.
function needsReview(fields, user) {
  if (user.role === 'admin') return false;
  return !!findKeyword(`${fields.title} ${fields.description}`, MODERATION_KEYWORDS);
}

function canView(listing, user) {
  const isOwner = user && listing.seller.equals(user._id);
  const isAdmin = user?.role === 'admin';
  if (isOwner || isAdmin) return true;
  if (listing.status === 'sold') return true;
  return listing.status === 'active' && !isExpired(listing);
}

function ownerOrAdmin(req, res, next) {
  const isOwner = req.listing.seller.equals(req.user._id);
  if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ error: 'Not your listing' });
  next();
}

async function loadListing(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Listing not found' });
  const listing = await Listing.findById(req.params.id);
  if (!listing || !canView(listing, req.user)) return res.status(404).json({ error: 'Listing not found' });
  req.listing = listing;
  next();
}

// Shape sent to the browser: adds expired flag and a simple pin object.
function present(listing, extra = {}) {
  const obj = listing.toObject ? listing.toObject() : listing;
  const coords = obj.coordinates?.coordinates;
  return {
    ...obj,
    coordinates: undefined,
    pin: coords?.length === 2 ? { lng: coords[0], lat: coords[1] } : null,
    expired: isExpired(obj),
    ...extra,
  };
}

// Tell users whose saved searches match a newly published ad.
export async function notifyMatchingSearches(listing) {
  const searches = await SavedSearch.find({ alerts: true, user: { $ne: listing.seller } }).limit(1000).lean();
  const done = new Set();
  for (const s of searches) {
    const uid = String(s.user);
    if (done.has(uid) || !listingMatchesSearch(listing, s.params)) continue;
    done.add(uid);
    await notify(s.user, {
      type: 'saved-search',
      title: `New ad for "${s.name}"`,
      body: listing.title,
      link: `/listings/${listing._id}`,
    });
  }
}

// Search and filter live listings.
router.get('/', async (req, res) => {
  const f = searchSchema.parse(req.query);
  if (f.seller && !mongoose.isValidObjectId(f.seller)) return res.json({ items: [], total: 0, page: 1, pages: 0 });
  const filter = buildFilter(f, req.query);

  // Relevance sorting needs the text score, which cannot be mixed with field exclusions,
  // so in that case the long fields are dropped in JavaScript instead.
  const byRelevance = f.sort === 'relevance' && !!f.q;
  let query = Listing.find(filter);
  if (byRelevance) {
    query = query.select({ score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
  } else {
    query = query.select('-description -attributes -moderationNote').sort(SORTS[f.sort === 'relevance' ? 'newest' : f.sort]);
  }

  const [items, total] = await Promise.all([
    query
      .skip((f.page - 1) * f.limit)
      .limit(f.limit)
      .populate('seller', 'name avatar'),
    Listing.countDocuments(filter),
  ]);
  const slim = byRelevance ? { description: undefined, attributes: undefined, moderationNote: undefined } : {};
  res.json({ items: items.map((i) => present(i, slim)), total, page: f.page, pages: Math.ceil(total / f.limit) });
});

// The logged-in seller's own ads (every status except removed) with simple statistics.
router.get('/mine', requireAuth, async (req, res) => {
  const items = await Listing.find({ seller: req.user._id, status: { $ne: 'removed' } }).sort({ createdAt: -1 });
  const ids = items.map((i) => i._id);
  const [favs, chats] = await Promise.all([
    Favorite.aggregate([{ $match: { listing: { $in: ids } } }, { $group: { _id: '$listing', n: { $sum: 1 } } }]),
    Conversation.aggregate([{ $match: { listing: { $in: ids } } }, { $group: { _id: '$listing', n: { $sum: 1 } } }]),
  ]);
  const favMap = Object.fromEntries(favs.map((x) => [String(x._id), x.n]));
  const chatMap = Object.fromEntries(chats.map((x) => [String(x._id), x.n]));
  res.json({
    items: items.map((i) =>
      present(i, { stats: { views: i.views, favorites: favMap[String(i._id)] || 0, chats: chatMap[String(i._id)] || 0 } })
    ),
  });
});

router.get('/:id', loadListing, async (req, res) => {
  const listing = req.listing;
  const isOwner = req.user && listing.seller.equals(req.user._id);
  if (!isOwner) await Listing.updateOne({ _id: listing._id }, { $inc: { views: 1 } });

  const seller = await User.findById(listing.seller);
  const [stats, favoritesCount, isFavorite] = await Promise.all([
    seller ? sellerStats(seller) : null,
    Favorite.countDocuments({ listing: listing._id }),
    req.user ? Favorite.exists({ user: req.user._id, listing: listing._id }) : false,
  ]);
  res.json(
    present(listing, {
      moderationNote: isOwner || req.user?.role === 'admin' ? listing.moderationNote : undefined,
      seller: seller ? { _id: seller._id, name: seller.name, avatar: seller.avatar, createdAt: seller.createdAt } : null,
      sellerStats: stats ? { trusted: stats.trusted, avgRating: stats.avgRating, reviewCount: stats.reviewCount, soldAds: stats.soldAds } : null,
      favoritesCount,
      isFavorite: !!isFavorite,
    })
  );
});

// Similar ads: same category, similar price, newest first.
router.get('/:id/similar', loadListing, async (req, res) => {
  const l = req.listing;
  const items = await Listing.find({
    ...liveFilter(),
    _id: { $ne: l._id },
    category: l.category,
    price: { $gte: l.price * 0.5, $lte: Math.max(l.price * 2, 1000) },
  })
    .sort({ refreshedAt: -1 })
    .limit(8)
    .select('-description -attributes -moderationNote')
    .populate('seller', 'name avatar');
  res.json({ items: items.map((i) => present(i)) });
});

// The seller's phone number: logged-in users only, and only when the seller allows it.
router.get('/:id/contact', requireAuth, loadListing, async (req, res) => {
  const listing = req.listing;
  if (await isBlockedBetween(req.user._id, listing.seller)) return res.status(403).json({ error: 'You cannot contact this seller' });
  if (!listing.showPhone) {
    return res.status(403).json({ error: 'This seller only accepts chat messages', chatOnly: true });
  }
  const seller = await User.findById(listing.seller).select('name phone');
  if (!seller?.phone) return res.status(404).json({ error: 'The seller has not added a phone number', chatOnly: true });
  res.json({ name: seller.name, phone: seller.phone });
});

router.post('/', requireAuth, async (req, res) => {
  const data = listingSchema.parse(req.body);
  if (data.showPhone && !req.user.phone) {
    return res.status(400).json({ error: 'Add your phone number to your profile, or turn off "Show my phone number" to use chat only' });
  }
  const recent = await Listing.countDocuments({ seller: req.user._id, createdAt: { $gte: new Date(Date.now() - DAY) } });
  if (recent >= MAX_NEW_ADS_PER_DAY) {
    return res.status(429).json({ error: `You can post up to ${MAX_NEW_ADS_PER_DAY} ads per day` });
  }

  const fields = prepareFields(data);
  const pending = needsReview(fields, req.user);
  const now = new Date();
  const listing = await Listing.create({
    ...fields,
    seller: req.user._id,
    status: pending ? 'pending' : 'active',
    expiresAt: new Date(now.getTime() + AD_LIFETIME_DAYS * DAY),
    refreshedAt: now,
  });
  if (!pending) notifyMatchingSearches(listing).catch((e) => console.error(e.message));
  res.status(201).json(present(listing));
});

router.put('/:id', requireAuth, loadListing, ownerOrAdmin, async (req, res) => {
  const data = listingSchema.parse(req.body);
  if (data.showPhone && req.listing.seller.equals(req.user._id) && !req.user.phone) {
    return res.status(400).json({ error: 'Add your phone number to your profile, or turn off "Show my phone number"' });
  }
  const fields = prepareFields(data);
  const wasActive = req.listing.status === 'active';
  Object.assign(req.listing, fields);
  if (!fields.coordinates) req.listing.coordinates = undefined;
  if (wasActive && needsReview(fields, req.user)) req.listing.status = 'pending';
  await req.listing.save();
  res.json(present(req.listing));
});

// Soft delete: the ad disappears from the site but stays in the database for admins.
router.delete('/:id', requireAuth, loadListing, ownerOrAdmin, async (req, res) => {
  req.listing.status = 'removed';
  await req.listing.save();
  res.json({ ok: true });
});

// Seller changes: hide (inactive), sold, or show again (active).
router.patch('/:id/status', requireAuth, loadListing, ownerOrAdmin, async (req, res) => {
  const { status } = z.object({ status: z.enum(['active', 'inactive', 'sold']) }).parse(req.body);
  const l = req.listing;
  if (l.status === 'pending') return res.status(400).json({ error: 'This ad is waiting for review' });
  if (status === 'active' && l.status !== 'active') {
    // Showing an ad again starts a fresh 30 days if its time ran out.
    if (!l.expiresAt || l.expiresAt <= new Date()) {
      l.expiresAt = new Date(Date.now() + AD_LIFETIME_DAYS * DAY);
      l.refreshedAt = new Date();
    }
  }
  l.status = status;
  await l.save();
  res.json(present(l));
});

// Kept so older clients that call /:id/sold keep working.
router.patch('/:id/sold', requireAuth, loadListing, ownerOrAdmin, async (req, res) => {
  req.listing.status = 'sold';
  await req.listing.save();
  res.json(present(req.listing));
});

// Renew: another 30 days and back to the top of the results. Once every 7 days, unless it already expired.
router.post('/:id/renew', requireAuth, loadListing, ownerOrAdmin, async (req, res) => {
  const l = req.listing;
  if (!['active', 'inactive'].includes(l.status)) return res.status(400).json({ error: 'Only active or hidden ads can be renewed' });
  const expired = isExpired(l) || (l.expiresAt && l.expiresAt <= new Date());
  if (!expired && l.lastRenewedAt) {
    const wait = RENEW_EVERY_DAYS * DAY - (Date.now() - l.lastRenewedAt.getTime());
    if (wait > 0) {
      const days = Math.ceil(wait / DAY);
      return res.status(429).json({ error: `You can renew this ad again in ${days} day${days === 1 ? '' : 's'}` });
    }
  }
  const now = new Date();
  l.expiresAt = new Date(now.getTime() + AD_LIFETIME_DAYS * DAY);
  l.refreshedAt = now;
  l.lastRenewedAt = now;
  l.status = 'active';
  await l.save();
  res.json(present(l));
});

router.post('/:id/report', requireAuth, loadListing, async (req, res) => {
  const { reason, note } = z
    .object({ reason: z.enum(REPORT_REASONS), note: z.string().trim().max(1000).optional() })
    .parse(req.body);
  try {
    await Report.create({ listing: req.listing._id, reporter: req.user._id, reason, note });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'You already reported this listing' });
    throw err;
  }
  res.status(201).json({ ok: true });
});

export default router;
