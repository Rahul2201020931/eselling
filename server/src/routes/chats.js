import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Listing, isExpired } from '../models/Listing.js';
import { Block, isBlockedBetween } from '../models/Block.js';
import { requireAuth } from '../middleware/auth.js';
import { findKeyword } from '../utils/trust.js';
import { QUICK_REPLIES, SCAM_PHRASES } from '../constants.js';

const router = Router();
router.use(requireAuth);

const LISTING_FIELDS = 'title price images status expiresAt seller';

const isBuyer = (conv, user) => conv.buyer._id ? conv.buyer._id.equals(user._id) : conv.buyer.equals(user._id);
const otherId = (conv, user) => {
  const buyerId = conv.buyer._id ?? conv.buyer;
  const sellerId = conv.seller._id ?? conv.seller;
  return buyerId.equals(user._id) ? sellerId : buyerId;
};

async function loadConversation(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Chat not found' });
  const conv = await Conversation.findById(req.params.id)
    .populate('listing', LISTING_FIELDS)
    .populate('buyer', 'name avatar')
    .populate('seller', 'name avatar');
  if (!conv || !(conv.buyer._id.equals(req.user._id) || conv.seller._id.equals(req.user._id))) {
    return res.status(404).json({ error: 'Chat not found' });
  }
  req.conv = conv;
  next();
}

function presentConversation(conv, user, blockedIds) {
  const buyer = isBuyer(conv, user);
  const other = buyer ? conv.seller : conv.buyer;
  const listing = conv.listing;
  return {
    id: conv._id,
    role: buyer ? 'buyer' : 'seller',
    listing: listing
      ? {
          _id: listing._id,
          title: listing.title,
          price: listing.price,
          image: listing.images?.[0]?.url,
          status: listing.status === 'active' && isExpired(listing) ? 'expired' : listing.status,
        }
      : null,
    other: { _id: other._id, name: other.name, avatar: other.avatar },
    lastMessage: conv.lastMessage?.at ? conv.lastMessage : null,
    unread: buyer ? conv.unreadBuyer : conv.unreadSeller,
    blocked: blockedIds.has(String(other._id)),
    updatedAt: conv.updatedAt,
  };
}

// Suggested one-tap messages.
router.get('/quick-replies', (_req, res) => res.json({ items: QUICK_REPLIES }));

// Total unread messages (for the badge in the top bar).
router.get('/unread-count', async (req, res) => {
  const [asBuyer, asSeller] = await Promise.all([
    Conversation.aggregate([{ $match: { buyer: req.user._id } }, { $group: { _id: null, n: { $sum: '$unreadBuyer' } } }]),
    Conversation.aggregate([{ $match: { seller: req.user._id } }, { $group: { _id: null, n: { $sum: '$unreadSeller' } } }]),
  ]);
  res.json({ count: (asBuyer[0]?.n ?? 0) + (asSeller[0]?.n ?? 0) });
});

// My inbox, most recent first.
router.get('/', async (req, res) => {
  const [convs, blocks] = await Promise.all([
    Conversation.find({ $or: [{ buyer: req.user._id }, { seller: req.user._id }] })
      .sort({ updatedAt: -1 })
      .limit(100)
      .populate('listing', LISTING_FIELDS)
      .populate('buyer', 'name avatar')
      .populate('seller', 'name avatar'),
    Block.find({ blocker: req.user._id }).select('blocked'),
  ]);
  const blockedIds = new Set(blocks.map((b) => String(b.blocked)));
  res.json({ items: convs.map((c) => presentConversation(c, req.user, blockedIds)) });
});

// Start a chat about a listing, or open the one that already exists.
router.post('/', async (req, res) => {
  const { listingId } = z.object({ listingId: z.string() }).parse(req.body);
  if (!mongoose.isValidObjectId(listingId)) return res.status(404).json({ error: 'Listing not found' });
  const listing = await Listing.findById(listingId);
  if (!listing || !['active', 'sold'].includes(listing.status) || isExpired(listing)) {
    return res.status(404).json({ error: 'Listing not found' });
  }
  if (listing.seller.equals(req.user._id)) return res.status(400).json({ error: 'This is your own ad' });
  if (await isBlockedBetween(req.user._id, listing.seller)) return res.status(403).json({ error: 'You cannot chat with this seller' });

  let conv = await Conversation.findOne({ listing: listing._id, buyer: req.user._id });
  if (!conv) {
    try {
      conv = await Conversation.create({ listing: listing._id, buyer: req.user._id, seller: listing.seller });
    } catch (err) {
      if (err.code !== 11000) throw err;
      conv = await Conversation.findOne({ listing: listing._id, buyer: req.user._id }); // created at the same moment
    }
  }
  res.status(201).json({ id: conv._id });
});

router.get('/:id', loadConversation, async (req, res) => {
  const blocks = await Block.find({ blocker: req.user._id }).select('blocked');
  const blockedIds = new Set(blocks.map((b) => String(b.blocked)));
  const blockedByThem = await Block.exists({ blocker: otherId(req.conv, req.user), blocked: req.user._id });
  res.json({ ...presentConversation(req.conv, req.user, blockedIds), blockedByThem: !!blockedByThem });
});

// Messages. Pass ?after=<ISO time> to get only newer ones (the page polls this every few seconds).
router.get('/:id/messages', loadConversation, async (req, res) => {
  const filter = { conversation: req.conv._id };
  const after = req.query.after ? new Date(String(req.query.after)) : null;
  if (after && !Number.isNaN(after.getTime())) filter.createdAt = { $gt: after };

  const items = after
    ? await Message.find(filter).sort({ createdAt: 1 }).limit(200)
    : (await Message.find(filter).sort({ createdAt: -1 }).limit(100)).reverse();

  // Reading the chat clears my unread counter.
  const field = isBuyer(req.conv, req.user) ? 'unreadBuyer' : 'unreadSeller';
  if (req.conv[field] > 0) await Conversation.updateOne({ _id: req.conv._id }, { [field]: 0 });

  res.json({ items });
});

const messageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string().trim().min(1).max(1000) }),
  z.object({
    type: z.literal('offer'),
    offerAmount: z.coerce.number().min(0),
    text: z.string().trim().max(300).optional(),
  }),
]);

router.post('/:id/messages', loadConversation, async (req, res) => {
  const body = messageSchema.parse(req.body);
  const other = otherId(req.conv, req.user);
  if (await isBlockedBetween(req.user._id, other)) {
    return res.status(403).json({ error: 'You cannot send messages in this chat' });
  }
  if (!req.conv.listing || !['active', 'sold'].includes(req.conv.listing.status)) {
    return res.status(400).json({ error: 'This ad is no longer available' });
  }

  const text = body.type === 'offer' ? (body.text || '') : body.text;
  const flagged = !!findKeyword(text, SCAM_PHRASES);
  const message = await Message.create({
    conversation: req.conv._id,
    sender: req.user._id,
    type: body.type,
    text,
    offerAmount: body.type === 'offer' ? body.offerAmount : undefined,
    flagged,
  });

  const preview = body.type === 'offer' ? `Offer: Rs. ${body.offerAmount}` : text.slice(0, 80);
  const otherUnread = isBuyer(req.conv, req.user) ? 'unreadSeller' : 'unreadBuyer';
  await Conversation.updateOne(
    { _id: req.conv._id },
    { $set: { lastMessage: { text: preview, sender: req.user._id, at: message.createdAt } }, $inc: { [otherUnread]: 1 } }
  );
  res.status(201).json(message);
});

export default router;
