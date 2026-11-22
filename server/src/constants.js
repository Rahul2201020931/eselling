export const CONDITIONS = ['new', 'like-new', 'used', 'for-parts'];
export const PRICE_TYPES = ['fixed', 'negotiable'];
export const REPORT_REASONS = ['scam', 'prohibited', 'wrong-category', 'duplicate', 'other'];

// Nepal's 7 provinces and their 77 districts.
export const PROVINCE_DISTRICTS = {
  Koshi: ['Bhojpur', 'Dhankuta', 'Ilam', 'Jhapa', 'Khotang', 'Morang', 'Okhaldhunga', 'Panchthar', 'Sankhuwasabha', 'Solukhumbu', 'Sunsari', 'Taplejung', 'Terhathum', 'Udayapur'],
  Madhesh: ['Bara', 'Dhanusha', 'Mahottari', 'Parsa', 'Rautahat', 'Saptari', 'Sarlahi', 'Siraha'],
  Bagmati: ['Bhaktapur', 'Chitwan', 'Dhading', 'Dolakha', 'Kathmandu', 'Kavrepalanchok', 'Lalitpur', 'Makwanpur', 'Nuwakot', 'Ramechhap', 'Rasuwa', 'Sindhuli', 'Sindhupalchok'],
  Gandaki: ['Baglung', 'Gorkha', 'Kaski', 'Lamjung', 'Manang', 'Mustang', 'Myagdi', 'Nawalpur', 'Parbat', 'Syangja', 'Tanahun'],
  Lumbini: ['Arghakhanchi', 'Banke', 'Bardiya', 'Dang', 'Eastern Rukum', 'Gulmi', 'Kapilvastu', 'Palpa', 'Parasi', 'Pyuthan', 'Rolpa', 'Rupandehi'],
  Karnali: ['Dailekh', 'Dolpa', 'Humla', 'Jajarkot', 'Jumla', 'Kalikot', 'Mugu', 'Salyan', 'Surkhet', 'Western Rukum'],
  Sudurpashchim: ['Achham', 'Baitadi', 'Bajhang', 'Bajura', 'Dadeldhura', 'Darchula', 'Doti', 'Kailali', 'Kanchanpur'],
};
export const PROVINCES = Object.keys(PROVINCE_DISTRICTS);
export const DISTRICTS = Object.values(PROVINCE_DISTRICTS).flat();

// Category tree. Each category has subcategories and its own extra fields.
// field.type: 'text' | 'number' | 'select'. filterable fields also appear as search filters.
const yesNo = ['yes', 'no'];
export const CATEGORY_TREE = {
  property: {
    subcategories: ['house', 'apartment', 'land', 'room', 'shop-office', 'other'],
    fields: [
      { key: 'listingType', label: 'For', type: 'select', options: ['sale', 'rent'], filterable: true },
      { key: 'bedrooms', label: 'Bedrooms', type: 'number', filterable: true },
      { key: 'bathrooms', label: 'Bathrooms', type: 'number' },
      { key: 'areaSqFt', label: 'Area (sq ft)', type: 'number', filterable: true },
      { key: 'furnishing', label: 'Furnishing', type: 'select', options: ['unfurnished', 'semi-furnished', 'furnished'], filterable: true },
      { key: 'parking', label: 'Parking', type: 'select', options: yesNo },
    ],
  },
  vehicles: {
    subcategories: ['car', 'motorcycle', 'scooter', 'bicycle', 'truck-bus', 'parts-accessories', 'other'],
    fields: [
      { key: 'brand', label: 'Brand', type: 'text', filterable: true },
      { key: 'model', label: 'Model', type: 'text' },
      { key: 'year', label: 'Year', type: 'number', filterable: true },
      { key: 'kilometres', label: 'Kilometres driven', type: 'number', filterable: true },
      { key: 'fuel', label: 'Fuel', type: 'select', options: ['petrol', 'diesel', 'electric', 'hybrid', 'other'], filterable: true },
      { key: 'transmission', label: 'Transmission', type: 'select', options: ['manual', 'automatic'], filterable: true },
      { key: 'owners', label: 'Number of owners', type: 'number' },
    ],
  },
  electronics: {
    subcategories: ['mobile', 'laptop-computer', 'tv-audio', 'camera', 'appliance', 'gaming', 'accessories', 'other'],
    fields: [
      { key: 'brand', label: 'Brand', type: 'text', filterable: true },
      { key: 'model', label: 'Model', type: 'text' },
      { key: 'warranty', label: 'Warranty left', type: 'select', options: yesNo, filterable: true },
      { key: 'boxAccessories', label: 'Box and accessories included', type: 'select', options: yesNo },
    ],
  },
  furniture: {
    subcategories: ['sofa-chairs', 'beds', 'tables', 'storage', 'decor', 'other'],
    fields: [
      { key: 'material', label: 'Material', type: 'text' },
      { key: 'ageYears', label: 'Age (years)', type: 'number' },
    ],
  },
  fashion: {
    subcategories: ['men', 'women', 'kids', 'shoes-bags', 'watches-jewellery', 'other'],
    fields: [
      { key: 'brand', label: 'Brand', type: 'text', filterable: true },
      { key: 'size', label: 'Size', type: 'text' },
    ],
  },
  books: {
    subcategories: ['textbooks', 'novels', 'exam-prep', 'instruments-hobbies', 'other'],
    fields: [{ key: 'author', label: 'Author', type: 'text' }],
  },
  pets: {
    subcategories: ['dogs', 'cats', 'birds', 'fish', 'pet-supplies', 'other'],
    fields: [{ key: 'ageMonths', label: 'Age (months)', type: 'number' }],
  },
  jobs: {
    subcategories: ['full-time', 'part-time', 'internship', 'freelance', 'other'],
    fields: [{ key: 'company', label: 'Company', type: 'text' }],
  },
  services: {
    subcategories: ['repair', 'education-tuition', 'events', 'transport', 'home-services', 'other'],
    fields: [],
  },
  other: { subcategories: ['other'], fields: [] },
};
export const CATEGORIES = Object.keys(CATEGORY_TREE);

// Check subcategory and extra fields against the category's definition.
// Returns clean attributes: unknown keys dropped, numbers converted, select values checked.
export function cleanAttributes(category, raw = {}) {
  const fields = CATEGORY_TREE[category]?.fields ?? [];
  const out = {};
  for (const f of fields) {
    const v = raw?.[f.key];
    if (v === undefined || v === null || v === '') continue;
    if (f.type === 'number') {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) out[f.key] = n;
    } else if (f.type === 'select') {
      if (f.options.includes(String(v))) out[f.key] = String(v);
    } else {
      out[f.key] = String(v).trim().slice(0, 100);
    }
  }
  return out;
}

export function isValidSubcategory(category, sub) {
  return CATEGORY_TREE[category]?.subcategories.includes(sub);
}

// Ad lifetime and renewal rules (same idea as OLX and Jiji).
export const AD_LIFETIME_DAYS = 30;
export const RENEW_EVERY_DAYS = 7;

// Words that send a new ad to an admin for review before it goes live.
export const MODERATION_KEYWORDS = [
  'gun', 'pistol', 'rifle', 'ammunition', 'explosive', 'weed', 'cannabis', 'marijuana', 'hashish',
  'cocaine', 'kidney', 'passport', 'citizenship card', 'fake id', 'escort', 'adult', 'visa sale',
];

// Phrases in chat that usually come with scams. The message is still sent, with a warning.
export const SCAM_PHRASES = [
  'advance', 'western union', 'paypal', 'qr code', 'otp', 'send money', 'transfer first',
  'gift card', 'courier will', 'pay first', 'esewa', 'khalti', 'ime pay', 'bank transfer',
];

export const QUICK_REPLIES = [
  'Is this still available?',
  'What is your lowest price?',
  'Can we meet in a public place?',
  'Can I see more photos?',
  'Is the price negotiable?',
];
