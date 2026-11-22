import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const COOKIE = 'token';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Put the login cookie on the response. The client talks to the API through its own
// address (Vite proxy in development, a Vercel rewrite in production), so a plain
// same-site cookie works and Safari's third-party cookie blocking does not matter.
export function setAuthCookie(res, user) {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: WEEK_MS,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE);
}

// Runs on every request: loads req.user when a valid cookie is present.
export async function attachUser(req, _res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return next();
  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(id);
    if (user && !user.isBanned) req.user = user;
  } catch {
    // Bad or expired token: treat as logged out.
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please log in first' });
  next();
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
  next();
}
