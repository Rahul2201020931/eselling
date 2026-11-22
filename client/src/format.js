export const formatPrice = (n) => `Rs. ${Number(n).toLocaleString('en-IN')}`;

export function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return new Date(date).toLocaleDateString();
}

// Whole days until a date (never below 0).
export function daysLeft(date) {
  if (!date) return null;
  return Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 86400000));
}

export const initials = (name = '?') =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

// What the ad's current state is, as one word the UI can show.
export function adState(listing) {
  if (listing.status === 'active' && listing.expired) return 'expired';
  return listing.status;
}

// Remember the last ads a person looked at (kept in this browser only).
const KEY = 'recent';
export function rememberListing(l) {
  try {
    const item = { _id: l._id, title: l.title, price: l.price, images: l.images?.slice(0, 1), location: l.location, status: l.status };
    const list = [item, ...JSON.parse(localStorage.getItem(KEY) || '[]').filter((x) => x._id !== l._id)].slice(0, 12);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // ignore: storage may be blocked
  }
}
export function recentListings() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}
