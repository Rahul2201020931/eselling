import { z } from 'zod';
import { CATEGORIES, CATEGORY_TREE, CONDITIONS, PROVINCES } from '../constants.js';
import { liveFilter } from '../models/Listing.js';

const num = z.coerce.number();

// Everything the search page can send. Unknown keys are ignored (extra attribute filters
// are read separately, because their names depend on the category).
export const searchSchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.enum(CATEGORIES).optional(),
  subcategory: z.string().trim().max(40).optional(),
  province: z.enum(PROVINCES).optional(),
  district: z.string().trim().max(60).optional(),
  condition: z.enum(CONDITIONS).optional(),
  minPrice: num.min(0).optional(),
  maxPrice: num.min(0).optional(),
  withPhotos: z.enum(['true', 'false']).optional(),
  postedWithin: num.int().min(1).max(365).optional(), // days
  seller: z.string().optional(),
  lat: num.min(-90).max(90).optional(),
  lng: num.min(-180).max(180).optional(),
  radiusKm: num.min(1).max(500).default(25),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'relevance']).default('newest'),
  page: num.int().min(1).default(1),
  limit: num.int().min(1).max(50).default(20),
});

const escapeRegex = (s) => s.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');

// Turn search params into a MongoDB filter. `raw` is req.query, used for the
// category-specific filters named attr.<key> (select: exact) and attr.<key>.min / .max (number).
export function buildFilter(f, raw = {}) {
  const filter = liveFilter();
  if (f.q) filter.$text = { $search: f.q };
  if (f.category) filter.category = f.category;
  if (f.subcategory) filter.subcategory = f.subcategory;
  if (f.province) filter['location.province'] = f.province;
  if (f.district) filter['location.district'] = new RegExp(`^${escapeRegex(f.district)}$`, 'i');
  if (f.condition) filter.condition = f.condition;
  if (f.seller) filter.seller = f.seller;
  if (f.withPhotos === 'true') filter['images.0'] = { $exists: true };
  if (f.postedWithin) filter.refreshedAt = { $gte: new Date(Date.now() - f.postedWithin * 86400000) };

  if (f.minPrice !== undefined || f.maxPrice !== undefined) {
    filter.price = {};
    if (f.minPrice !== undefined) filter.price.$gte = f.minPrice;
    if (f.maxPrice !== undefined) filter.price.$lte = f.maxPrice;
  }

  // Nearby: ads whose map pin is inside the radius. (Ads without a pin do not match.)
  if (f.lat !== undefined && f.lng !== undefined) {
    filter.coordinates = { $geoWithin: { $centerSphere: [[f.lng, f.lat], f.radiusKm / 6378.1] } };
  }

  // Category-specific filters, only for fields the category defines as filterable.
  const fields = f.category ? CATEGORY_TREE[f.category].fields.filter((x) => x.filterable) : [];
  for (const field of fields) {
    const key = `attributes.${field.key}`;
    if (field.type === 'number') {
      const min = Number(raw[`attr.${field.key}.min`]);
      const max = Number(raw[`attr.${field.key}.max`]);
      const range = {};
      if (raw[`attr.${field.key}.min`] !== undefined && raw[`attr.${field.key}.min`] !== '' && Number.isFinite(min)) range.$gte = min;
      if (raw[`attr.${field.key}.max`] !== undefined && raw[`attr.${field.key}.max`] !== '' && Number.isFinite(max)) range.$lte = max;
      if (Object.keys(range).length) filter[key] = range;
    } else {
      const v = raw[`attr.${field.key}`];
      if (typeof v === 'string' && v) {
        if (field.type === 'select') {
          if (field.options.includes(v)) filter[key] = v;
        } else {
          filter[key] = new RegExp(`^${escapeRegex(v.slice(0, 60))}$`, 'i');
        }
      }
    }
  }
  return filter;
}

// Same rules as buildFilter, but applied in JavaScript to one new listing.
// Used to decide which saved searches should get an alert.
export function listingMatchesSearch(listing, params = {}) {
  const p = params;
  if (p.category && listing.category !== p.category) return false;
  if (p.subcategory && listing.subcategory !== p.subcategory) return false;
  if (p.province && listing.location?.province !== p.province) return false;
  if (p.district && listing.location?.district?.toLowerCase() !== String(p.district).toLowerCase()) return false;
  if (p.condition && listing.condition !== p.condition) return false;
  if (p.minPrice !== undefined && p.minPrice !== '' && listing.price < Number(p.minPrice)) return false;
  if (p.maxPrice !== undefined && p.maxPrice !== '' && listing.price > Number(p.maxPrice)) return false;
  if (p.withPhotos === 'true' && !listing.images?.length) return false;
  if (p.q) {
    const hay = `${listing.title} ${listing.description}`.toLowerCase();
    // every word of the search must appear somewhere in the ad
    if (!String(p.q).toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w))) return false;
  }
  return true;
}
