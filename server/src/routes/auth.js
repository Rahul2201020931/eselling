import { Router } from 'express';
import bcrypt from 'bcryptjs';
import passport from 'passport';
import { z } from 'zod';
import { User, publicUser } from '../models/User.js';
import { clearAuthCookie, requireAuth, setAuthCookie } from '../middleware/auth.js';
import { socialEnabled } from '../config/passport.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\- ]{7,15}$/, 'Enter a valid phone number')
    .optional(),
});

router.post('/register', async (req, res) => {
  const { name, email, password } = registerSchema.parse(req.body);
  if (await User.exists({ email })) return res.status(409).json({ error: 'Email already registered' });

  const user = await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    role: email === process.env.ADMIN_EMAIL?.toLowerCase() ? 'admin' : 'user',
  });
  setAuthCookie(res, user);
  res.status(201).json(publicUser(user));
});

router.post('/login', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await User.findOne({ email }).select('+passwordHash');
  // Same message for "no such user" and "wrong password" on purpose.
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Wrong email or password' });
  }
  if (user.isBanned) return res.status(403).json({ error: 'This account is banned' });
  setAuthCookie(res, user);
  res.json(publicUser(user));
});

router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => res.json(publicUser(req.user)));

router.patch('/me', requireAuth, async (req, res) => {
  const updates = profileSchema.parse(req.body);
  Object.assign(req.user, updates);
  await req.user.save();
  res.json(publicUser(req.user));
});

// Which social buttons the client should show.
router.get('/providers', (_req, res) => res.json(socialEnabled));

// Social login. Each provider has a start route and a callback route.
for (const [name, scope] of [
  ['google', ['profile', 'email']],
  ['facebook', ['email']],
]) {
  router.get(`/${name}`, (req, res, next) => {
    if (!socialEnabled[name]) return res.status(501).json({ error: `${name} login is not configured` });
    passport.authenticate(name, { scope, session: false })(req, res, next);
  });

  router.get(
    `/${name}/callback`,
    (req, res, next) => {
      if (!socialEnabled[name]) return res.status(501).json({ error: `${name} login is not configured` });
      passport.authenticate(name, { session: false, failureRedirect: '/login?error=social' })(req, res, next);
    },
    (req, res) => {
      if (req.user.isBanned) return res.redirect('/login?error=banned');
      setAuthCookie(res, req.user);
      res.redirect('/');
    }
  );
}

export default router;
