import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { User } from '../models/User.js';

// Find the user for a social profile, link it to an existing email account, or create one.
async function findOrCreateSocial(field, profile) {
  let user = await User.findOne({ [field]: profile.id });
  if (user) return user;

  const email = profile.emails?.[0]?.value?.toLowerCase(); // Facebook may not return one
  if (email) {
    user = await User.findOne({ email });
    if (user) {
      user[field] = profile.id;
      await user.save();
      return user;
    }
  }

  return User.create({
    name: profile.displayName || 'New user',
    email,
    avatar: profile.photos?.[0]?.value,
    role: email && email === process.env.ADMIN_EMAIL?.toLowerCase() ? 'admin' : 'user',
    [field]: profile.id,
  });
}

export const socialEnabled = { google: false, facebook: false };

export function configurePassport() {
  const base = process.env.PUBLIC_URL;

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${base}/api/auth/google/callback`,
        },
        (_at, _rt, profile, done) => findOrCreateSocial('googleId', profile).then((u) => done(null, u), done)
      )
    );
    socialEnabled.google = true;
  }

  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: process.env.FACEBOOK_APP_ID,
          clientSecret: process.env.FACEBOOK_APP_SECRET,
          callbackURL: `${base}/api/auth/facebook/callback`,
          profileFields: ['id', 'displayName', 'photos', 'email'],
        },
        (_at, _rt, profile, done) => findOrCreateSocial('facebookId', profile).then((u) => done(null, u), done)
      )
    );
    socialEnabled.facebook = true;
  }
}
