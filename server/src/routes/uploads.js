import { Router } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// The browser uploads images straight to Cloudinary, so they never pass through
// the free server. This route only hands out a short-lived signature.
router.post('/sign', requireAuth, (_req, res) => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return res.status(501).json({ error: 'Image upload is not configured' });
  }
  const timestamp = Math.round(Date.now() / 1000);
  const folder = 'eselling';
  const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, CLOUDINARY_API_SECRET);
  res.json({ timestamp, folder, signature, apiKey: CLOUDINARY_API_KEY, cloudName: CLOUDINARY_CLOUD_NAME });
});

export default router;
