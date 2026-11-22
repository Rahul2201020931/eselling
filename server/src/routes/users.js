import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Review } from '../models/Review.js';
import { Block } from '../models/Block.js';
import { Conversation } from '../models/Conversation.js';
import { notify } from '../models/Notification.js';
import { requireAuth } from '../middleware/auth.js';
import { sellerStats } from '../utils/trust.js';

const router = Router();

async function loadUser(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'User not found' });
  const user = await User.findById(req.params.id);
  if (!user || user.isBanned) return res.status(404).json({ error: 'User not found' });
  req.target = user;
  next();
}

// People I have blocked.
router.get('/blocked/list', requireAuth, async (req, res) => {
  const blocks = await Block.find({ blocker: req.user._id }).populate('blocked', 'name avatar');
  res.json({ items: blocks.map((b) => b.blocked).filter(Boolean) });
});

// Public seller profile. Never includes email or phone.
router.get('/:id', loadUser, async (req, res) => {
  const u = req.target;
  const stats = await sellerStats(u);
  const blocked = req.user ? !!(await Block.exists({ blocker: req.user._id, blocked: u._id })) : false;
  res.json({
    _id: u._id,
    name: u.name,
    avatar: u.avatar,
    memberSince: u.createdAt,
    ...stats,
    blockedByMe: blocked,
  });
});

router.get('/:id/reviews', loadUser, async (req, res) => {
  const items = await Review.find({ seller: req.target._id }).sort({ createdAt: -1 }).limit(50).populate('reviewer', 'name avatar');
  res.json({ items });
});

// Leave or change a review. Allowed only after you have chatted with this seller about one of their ads.
router.post('/:id/reviews', requireAuth, loadUser, async (req, res) => {
  const { rating, comment } = z
    .object({ rating: z.coerce.number().int().min(1).max(5), comment: z.string().trim().max(500).optional() })
    .parse(req.body);
  if (req.target._id.equals(req.user._id)) return res.status(400).json({ error: 'You cannot review yourself' });

  const talked = await Conversation.exists({ buyer: req.user._id, seller: req.target._id });
  if (!talked) return res.status(403).json({ error: 'Chat with this seller about an ad before reviewing them' });

  const existing = await Review.findOne({ seller: req.target._id, reviewer: req.user._id });
  const review = await Review.findOneAndUpdate(
    { seller: req.target._id, reviewer: req.user._id },
    { rating, comment },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  if (!existing) {
    notify(req.target._id, {
      type: 'review',
      title: `${req.user.name} rated you ${rating}/5`,
      body: comment?.slice(0, 120),
      link: `/u/${req.target._id}`,
    });
  }
  res.status(existing ? 200 : 201).json(review);
});

router.delete('/:id/reviews', requireAuth, async (req, res) => {
  if (mongoose.isValidObjectId(req.params.id)) {
    await Review.deleteOne({ seller: req.params.id, reviewer: req.user._id });
  }
  res.json({ ok: true });
});

router.post('/:id/block', requireAuth, loadUser, async (req, res) => {
  if (req.target._id.equals(req.user._id)) return res.status(400).json({ error: 'You cannot block yourself' });
  await Block.updateOne({ blocker: req.user._id, blocked: req.target._id }, {}, { upsert: true });
  res.status(201).json({ ok: true });
});

router.delete('/:id/block', requireAuth, async (req, res) => {
  if (mongoose.isValidObjectId(req.params.id)) {
    await Block.deleteOne({ blocker: req.user._id, blocked: req.params.id });
  }
  res.json({ ok: true });
});

export default router;
