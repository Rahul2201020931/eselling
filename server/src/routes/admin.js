import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Report } from '../models/Report.js';
import { User } from '../models/User.js';
import { Listing } from '../models/Listing.js';
import { Conversation } from '../models/Conversation.js';
import { notify } from '../models/Notification.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { notifyMatchingSearches } from './listings.js';
import { AD_LIFETIME_DAYS } from '../constants.js';

const router = Router();
router.use(requireAuth, requireAdmin);

const DAY = 86400000;
const escapeRegex = (s) => s.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');

router.get('/stats', async (_req, res) => {
  const now = new Date();
  const [users, activeAds, pendingAds, openReports, chats, newAdsToday, newUsersToday] = await Promise.all([
    User.countDocuments(),
    Listing.countDocuments({ status: 'active', expiresAt: { $gt: now } }),
    Listing.countDocuments({ status: 'pending' }),
    Report.countDocuments({ status: 'open' }),
    Conversation.countDocuments(),
    Listing.countDocuments({ createdAt: { $gte: new Date(now - DAY) } }),
    User.countDocuments({ createdAt: { $gte: new Date(now - DAY) } }),
  ]);
  res.json({ users, activeAds, pendingAds, openReports, chats, newAdsToday, newUsersToday });
});

router.get('/reports', async (req, res) => {
  const status = z.enum(['open', 'resolved', 'dismissed']).default('open').parse(req.query.status);
  const items = await Report.find({ status })
    .sort({ createdAt: -1 })
    .populate('listing', 'title status seller')
    .populate('reporter', 'name email');
  res.json({ items });
});

router.patch('/reports/:id', async (req, res) => {
  const { status } = z.object({ status: z.enum(['open', 'resolved', 'dismissed']) }).parse(req.body);
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Report not found' });
  const report = await Report.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!report) return res.status(404).json({ error: 'Report not found' });
  res.json(report);
});

// Ads held back by the keyword check, waiting for a decision.
router.get('/listings/pending', async (_req, res) => {
  const items = await Listing.find({ status: 'pending' }).sort({ createdAt: 1 }).limit(100).populate('seller', 'name email');
  res.json({ items });
});

router.patch('/listings/:id/review', async (req, res) => {
  const { action, note } = z
    .object({ action: z.enum(['approve', 'reject']), note: z.string().trim().max(300).optional() })
    .parse(req.body);
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Listing not found' });
  const listing = await Listing.findById(req.params.id);
  if (!listing || listing.status !== 'pending') return res.status(404).json({ error: 'No pending ad with this id' });

  if (action === 'approve') {
    listing.status = 'active';
    listing.expiresAt = new Date(Date.now() + AD_LIFETIME_DAYS * DAY);
    listing.refreshedAt = new Date();
    listing.moderationNote = undefined;
    await listing.save();
    notify(listing.seller, { type: 'moderation', title: 'Your ad is live', body: listing.title, link: `/listings/${listing._id}` });
    notifyMatchingSearches(listing).catch((e) => console.error(e.message));
  } else {
    listing.status = 'removed';
    listing.moderationNote = note || 'This ad does not follow our rules';
    await listing.save();
    notify(listing.seller, { type: 'moderation', title: 'Your ad was not approved', body: `${listing.title}: ${listing.moderationNote}` });
  }
  res.json({ ok: true, status: listing.status });
});

router.get('/users', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 60) : '';
  const filter = q ? { $or: [{ name: new RegExp(escapeRegex(q), 'i') }, { email: new RegExp(escapeRegex(q), 'i') }] } : {};
  const items = await User.find(filter).sort({ createdAt: -1 }).limit(50).select('name email phone role isBanned createdAt');
  res.json({ items });
});

// Ban or unban. A banned user's live ads are hidden; unbanning lets them show the ads again.
router.patch('/users/:id/ban', async (req, res) => {
  const { isBanned } = z.object({ isBanned: z.boolean() }).parse(req.body);
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'User not found' });
  if (req.params.id === String(req.user._id)) return res.status(400).json({ error: 'You cannot ban yourself' });
  const user = await User.findByIdAndUpdate(req.params.id, { isBanned }, { new: true });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (isBanned) {
    await Listing.updateMany({ seller: user._id, status: { $in: ['active', 'pending'] } }, { status: 'inactive' });
  }
  res.json({ id: user._id, isBanned: user.isBanned });
});

export default router;
