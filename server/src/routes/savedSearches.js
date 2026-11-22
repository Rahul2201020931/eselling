import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { SavedSearch } from '../models/SavedSearch.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const MAX_PER_USER = 20;
// Only these search filters can be saved.
const KEYS = ['q', 'category', 'subcategory', 'province', 'district', 'condition', 'minPrice', 'maxPrice', 'withPhotos'];

router.get('/', async (req, res) => {
  const items = await SavedSearch.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ items });
});

router.post('/', async (req, res) => {
  const { name, params } = z
    .object({ name: z.string().trim().min(1).max(100), params: z.record(z.any()).default({}) })
    .parse(req.body);

  const clean = {};
  for (const k of KEYS) {
    const v = params[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') clean[k] = String(v).slice(0, 100);
  }
  if (Object.keys(clean).length === 0) return res.status(400).json({ error: 'Choose at least one filter or search word first' });
  if ((await SavedSearch.countDocuments({ user: req.user._id })) >= MAX_PER_USER) {
    return res.status(400).json({ error: `You can save up to ${MAX_PER_USER} searches` });
  }
  const saved = await SavedSearch.create({ user: req.user._id, name, params: clean });
  res.status(201).json(saved);
});

router.patch('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const updates = z.object({ alerts: z.boolean().optional(), name: z.string().trim().min(1).max(100).optional() }).parse(req.body);
  const saved = await SavedSearch.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, updates, { new: true });
  if (!saved) return res.status(404).json({ error: 'Not found' });
  res.json(saved);
});

router.delete('/:id', async (req, res) => {
  if (mongoose.isValidObjectId(req.params.id)) {
    await SavedSearch.deleteOne({ _id: req.params.id, user: req.user._id });
  }
  res.json({ ok: true });
});

export default router;
