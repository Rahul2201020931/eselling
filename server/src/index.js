import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import { ZodError } from 'zod';
import { connectDB } from './config/db.js';
import { configurePassport } from './config/passport.js';
import { attachUser } from './middleware/auth.js';
import { Listing } from './models/Listing.js';
import {
  AD_LIFETIME_DAYS,
  CATEGORY_TREE,
  CONDITIONS,
  PRICE_TYPES,
  PROVINCE_DISTRICTS,
  QUICK_REPLIES,
  REPORT_REASONS,
} from './constants.js';
import authRoutes from './routes/auth.js';
import listingRoutes from './routes/listings.js';
import favoriteRoutes from './routes/favorites.js';
import uploadRoutes from './routes/uploads.js';
import adminRoutes from './routes/admin.js';
import chatRoutes from './routes/chats.js';
import userRoutes from './routes/users.js';
import savedSearchRoutes from './routes/savedSearches.js';
import notificationRoutes from './routes/notifications.js';

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set. Copy .env.example to .env first.');

const app = express();
app.set('trust proxy', 1); // Render and Vercel sit in front of the server

app.use(helmet());
app.use(cors({ origin: process.env.PUBLIC_URL, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(passport.initialize());
app.use(attachUser);

// Slow down password guessing and spam.
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20 }));
app.use('/api/auth/register', rateLimit({ windowMs: 60 * 60 * 1000, limit: 20 }));
app.use('/api/chats', rateLimit({ windowMs: 60 * 1000, limit: 240 })); // the chat page polls every few seconds
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 300 }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Lists the client uses to build its menus and forms, so they live in one place.
app.get('/api/meta', (_req, res) =>
  res.json({
    categories: Object.keys(CATEGORY_TREE),
    categoryTree: CATEGORY_TREE,
    conditions: CONDITIONS,
    priceTypes: PRICE_TYPES,
    provinces: Object.keys(PROVINCE_DISTRICTS),
    provinceDistricts: PROVINCE_DISTRICTS,
    reportReasons: REPORT_REASONS,
    quickReplies: QUICK_REPLIES,
    adLifetimeDays: AD_LIFETIME_DAYS,
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/saved-searches', savedSearchRoutes);
app.use('/api/notifications', notificationRoutes);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// Express 5 passes errors from async handlers here.
app.use((err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
  }
  if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

// Ads posted before expiry, subcategories and the phone setting existed get sensible defaults.
export async function backfillListings() {
  const day = 86400000;
  await Listing.updateMany(
    { refreshedAt: { $exists: false } },
    [{ $set: { refreshedAt: '$createdAt', expiresAt: new Date(Date.now() + AD_LIFETIME_DAYS * day) } }]
  );
  await Listing.updateMany({ subcategory: { $exists: false } }, { subcategory: 'other' });
  await Listing.updateMany({ showPhone: { $exists: false } }, { showPhone: true });
}

export { app };

if (process.env.NODE_ENV !== 'test') {
  configurePassport();
  const port = process.env.PORT || 5000;
  connectDB()
    .then(() => backfillListings())
    .then(() => app.listen(port, () => console.log(`API running on port ${port}`)))
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
