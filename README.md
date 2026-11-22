# Eselling

A second-hand marketplace for Nepal. Buyers and sellers deal directly: there is no payment code.
Built with MongoDB, Express, React and Node (MERN), and designed to run on free plans.

## What works

**Buying and selling**
- Sign-up and login with email, Google and Facebook
- Post, edit, hide, renew, mark as sold and delete ads; up to 8 photos (uploaded straight to Cloudinary), choose the cover photo
- Categories with subcategories and category-specific fields (for example brand, year, RAM, bedrooms), all 77 districts grouped by province
- Ads last 30 days, then expire; Renew puts an ad back on top (once every 7 days); stats per ad (views, saves, chats)
- Optional map pin (OpenStreetMap, rounded to about 100 m) and a "near me" search
- Search and filters: text, category, subcategory, province, district, price, condition, with photos, posted within, attribute filters, sort

**Talking and trust**
- In-app chat with quick replies, "make an offer", unread counters, block user, and a warning when a message looks like a scam
- Sellers can hide their phone number and accept chat only
- Public seller profile with ratings, reviews (only after chatting) and a "Trusted seller" badge
- Report an ad; admin page at `/admin` for stats, reports, ads waiting for approval and users (ban / unban)
- Ads that contain risky words wait for admin approval before they appear

**Staying informed**
- Hearts / saved ads, saved searches with in-app alerts, a notifications bell
- Share by WhatsApp, Facebook or copy link; similar ads; recently viewed
- English and Nepali switch (the Nepali dictionary is short; add more words in `client/src/i18n.jsx`)
- Safety tips, Help, Terms and Privacy pages (the last two are templates: have a lawyer check them)

**Deliberately not built** (they cost money or need a legal set-up): paid featured ads and packages, stores,
payments, delivery and escrow, SMS OTP login, push notifications and email alerts, AI photo posting, a mobile app.

**Not tested against a real database yet.** Syntax, validation, filters and models are unit tested, but chat,
text search, geo search, saved-search alerts and the admin actions need a test on your own MongoDB Atlas.

If you update from the older version: run `npm install` once in `client` (new map libraries). No new `.env`
values are needed. Old ads are filled in automatically on first start.

Map tiles come from the public OpenStreetMap server, which is fine for a small site; read their tile usage
policy before you get large traffic.

## Run it on your computer

You need Node 18 or newer, a free MongoDB Atlas cluster and a free Cloudinary account.

```bash
# 1. Server
cd server
cp .env.example .env     # then fill in the values
npm install
npm run dev              # API on http://localhost:5000

# 2. Client (in a second terminal)
cd client
npm install
npm run dev              # site on http://localhost:5173
```

Open http://localhost:5173. Always use this address, not :5000, because the Vite server forwards
`/api` calls to the API. That keeps the login cookie and the Google/Facebook callbacks on one address.

Register with the email you put in `ADMIN_EMAIL` to become an admin.

### Google and Facebook login

Both are optional: a button only appears once its keys are in `.env`.

- Google: create an OAuth client in Google Cloud Console. Authorized redirect URI:
  `http://localhost:5173/api/auth/google/callback`
- Facebook: create an app at Meta for Developers and add the Facebook Login product. Valid OAuth redirect URI:
  `http://localhost:5173/api/auth/facebook/callback`. For the public you also need a privacy policy page,
  and the app must be switched to Live. Some Facebook accounts return no email.

When you deploy, add the same two callback URLs with your real site address.

## Deploy for free

1. Push this folder to GitHub.
2. **Database:** MongoDB Atlas free tier. Allow access from anywhere (0.0.0.0/0) because Render's address changes.
3. **API:** Render free web service. Root directory `server`, build command `npm install`, start command
   `npm start`. Add every variable from `.env.example`, with `NODE_ENV=production` and `PUBLIC_URL` set to
   your Vercel address. Free services sleep when idle, so the first request after a pause is slow.
4. **Site:** Vercel (or Netlify). Root directory `client`. Before deploying, edit `client/vercel.json` and replace
   `YOUR-APP.onrender.com` with your Render address. The rewrite makes `/api` calls look like same-site calls,
   so the login cookie works.

Free-plan limits change, so check each service's current terms.

## Folder map

```
server/src/index.js        app setup, middleware, error handling
server/src/constants.js   categories, subcategories, fields, districts, keyword lists
server/src/models/         User, Listing, Favorite, Report, Conversation, Message, Block, Review, SavedSearch, Notification
server/src/routes/         auth, listings, chats, users, savedSearches, notifications, favorites, uploads, admin
server/src/utils/          search filters, trust badge rules
server/src/middleware/     login cookie, requireAuth, requireAdmin
server/src/config/         database and Google/Facebook strategies
client/src/pages/          Home, ListingDetail, PostAd, EditAd, Chats, SellerProfile, MyAds, Notifications, Admin, Info, Login, Profile
client/src/components/     ListingForm, ListingCard, MapPicker, HeartButton, Stars ...
client/src/i18n.jsx        English / Nepali
client/src/api.js          fetch helper and Cloudinary upload
```

## Before you launch

- Keep `.env` out of git (already in `.gitignore`).
- Edit the contact email in `client/src/pages/Info.jsx` and have the Terms and Privacy templates checked.
- Check what registration an online marketplace needs in Nepal.
- Seed 100+ real-looking ads and test with about 10 friends first.
