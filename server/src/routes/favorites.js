import { Router } from 'express';
import mongoose from 'mongoose';
import { Favorite } from '../models/Favorite.js';
import { Listing, isExpired } from '../models/Listing.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// Just the ids, so every ad card can show a filled or empty heart.
router.get('/ids', async (req, res) => {
  const favorites = await Favorite.find({ user: req.user._id }).select('listing');
  res.json({ ids: favorites.map((f) => String(f.listing)) });
});

router.get('/', async (req, res) => {
  const favorites = await Favorite.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate({
      path: 'listing',
      select: '-description -attributes -moderationNote',
      match: { status: { $in: ['active', 'sold'] } },
      populate: { path: 'seller', select: 'name avatar' },
    });
  // A favorite whose ad was removed comes back with listing = null; hide those.
  const items = favorites
    .map((f) => f.listing)
    .filter(Boolean)
    .map((l) => ({ ...l.toObject(), expired: isExpired(l) }));
  res.json({ items });
});

router.post('/:listingId', async (req, res) => {
  const { listingId } = req.params;
  if (!mongoose.isValidObjectId(listingId) || !(await Listing.exists({ _id: listingId, status: { $in: ['active', 'sold'] } }))) {
    return res.status(404).json({ error: 'Listing not found' });
  }
  await Favorite.updateOne({ user: req.user._id, listing: listingId }, {}, { upsert: true });
  res.status(201).json({ ok: true });
});

router.delete('/:listingId', async (req, res) => {
  if (mongoose.isValidObjectId(req.params.listingId)) {
    await Favorite.deleteOne({ user: req.user._id, listing: req.params.listingId });
  }
  res.json({ ok: true });
});

export default router;
