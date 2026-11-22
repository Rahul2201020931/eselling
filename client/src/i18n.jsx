import { createContext, useContext, useState } from 'react';

// English text is the key. Anything missing from this list simply stays in English.
const NE = {
  // navigation
  'Post an ad': 'विज्ञापन राख्नुहोस्',
  'My ads': 'मेरा विज्ञापन',
  'Log in': 'लग इन',
  'Log out': 'लग आउट',
  Admin: 'प्रशासक',
  Chats: 'च्याट',
  Notifications: 'सूचनाहरू',
  Profile: 'प्रोफाइल',
  // search and filters
  'Search for anything...': 'केही पनि खोज्नुहोस्...',
  Search: 'खोज्नुहोस्',
  All: 'सबै',
  'All categories': 'सबै वर्ग',
  'All subcategories': 'सबै उपवर्ग',
  'All provinces': 'सबै प्रदेश',
  'All districts': 'सबै जिल्ला',
  Category: 'वर्ग',
  Subcategory: 'उपवर्ग',
  Province: 'प्रदेश',
  District: 'जिल्ला',
  'Area / tole': 'क्षेत्र / टोल',
  'Min price': 'न्यूनतम मूल्य',
  'Max price': 'अधिकतम मूल्य',
  Condition: 'अवस्था',
  'Any condition': 'जुनसुकै अवस्था',
  Newest: 'नयाँ पहिले',
  'Price: low to high': 'मूल्य: कमदेखि बढी',
  'Price: high to low': 'मूल्य: बढीदेखि कम',
  Relevance: 'सान्दर्भिकता',
  'Posted: any time': 'राखेको: जुनसुकै बेला',
  'Last 24 hours': 'पछिल्लो २४ घण्टा',
  'Last 7 days': 'पछिल्लो ७ दिन',
  'Last 30 days': 'पछिल्लो ३० दिन',
  'With photos only': 'तस्बिर भएका मात्र',
  'Near me': 'मेरो नजिक',
  'Clear location': 'स्थान हटाउनुहोस्',
  'Save this search': 'यो खोजी सेभ गर्नुहोस्',
  'Clear filters': 'फिल्टर हटाउनुहोस्',
  Filters: 'फिल्टरहरू',
  'No ads found. Try different filters.': 'कुनै विज्ञापन भेटिएन। अरू फिल्टर प्रयास गर्नुहोस्।',
  'Loading...': 'लोड हुँदैछ...',
  Previous: 'अघिल्लो',
  Next: 'अर्को',
  'Recently viewed': 'हालै हेरिएका',
  'Similar ads': 'मिल्दाजुल्दा विज्ञापन',
  // conditions and price types
  new: 'नयाँ',
  'like-new': 'नयाँ जस्तै',
  used: 'प्रयोग गरिएको',
  'for-parts': 'पार्ट्सका लागि',
  fixed: 'तोकिएको',
  negotiable: 'मोलमोलाई हुन्छ',
  // categories
  property: 'घरजग्गा',
  vehicles: 'सवारी साधन',
  electronics: 'इलेक्ट्रोनिक्स',
  furniture: 'फर्निचर',
  fashion: 'फेसन',
  books: 'किताब',
  pets: 'घरपालुवा जनावर',
  jobs: 'जागिर',
  services: 'सेवा',
  other: 'अन्य',
  // listing page
  'Chat with seller': 'बिक्रेतासँग च्याट गर्नुहोस्',
  'Log in to chat': 'च्याट गर्न लग इन गर्नुहोस्',
  'Show phone number': 'फोन नम्बर हेर्नुहोस्',
  'This seller only accepts chat messages': 'यो बिक्रेताले च्याट मात्र स्वीकार गर्छ',
  Save: 'सेभ',
  Saved: 'सेभ गरियो',
  Share: 'सेयर',
  'Copy link': 'लिंक कपी गर्नुहोस्',
  Report: 'रिपोर्ट',
  Edit: 'सम्पादन',
  Delete: 'मेटाउनुहोस्',
  Renew: 'नवीकरण',
  Hide: 'लुकाउनुहोस्',
  'Show again': 'फेरि देखाउनुहोस्',
  'Mark as sold': 'बिक्री भयो',
  Sold: 'बिक्री भयो',
  Expired: 'म्याद सकियो',
  Pending: 'समीक्षामा',
  Hidden: 'लुकाइएको',
  Active: 'सक्रिय',
  Seller: 'बिक्रेता',
  'Member since': 'सदस्य बनेको',
  'Trusted seller': 'भरपर्दो बिक्रेता',
  Views: 'हेराइ',
  Saves: 'सेभ',
  'Approximate location': 'अनुमानित स्थान',
  Safety: 'सुरक्षा',
  'Safety tips': 'सुरक्षा सुझाव',
  'Meet in a public place, check the item before paying, and never send money in advance.':
    'सार्वजनिक ठाउँमा भेट्नुहोस्, पैसा तिर्नु अघि सामान जाँच्नुहोस्, र अग्रिम पैसा कहिल्यै नपठाउनुहोस्।',
  // post form
  Title: 'शीर्षक',
  Price: 'मूल्य',
  'Price (Rs.)': 'मूल्य (रू.)',
  'Price type': 'मूल्यको प्रकार',
  Description: 'विवरण',
  'Photos (up to 8)': 'तस्बिरहरू (८ वटासम्म)',
  'Show my phone number on this ad': 'यो विज्ञापनमा मेरो फोन नम्बर देखाउनुहोस्',
  'Publish ad': 'विज्ञापन प्रकाशित गर्नुहोस्',
  'Save changes': 'परिवर्तन सेभ गर्नुहोस्',
  'Please wait...': 'कृपया पर्खनुहोस्...',
  'Pin the location on the map (optional)': 'नक्सामा स्थान चिन्ह लगाउनुहोस् (ऐच्छिक)',
  'Use my location': 'मेरो स्थान प्रयोग गर्नुहोस्',
  'Remove pin': 'चिन्ह हटाउनुहोस्',
  // chat
  Messages: 'सन्देशहरू',
  Send: 'पठाउनुहोस्',
  'Type a message...': 'सन्देश लेख्नुहोस्...',
  'Make an offer': 'प्रस्ताव गर्नुहोस्',
  'Offer (Rs.)': 'प्रस्ताव (रू.)',
  Block: 'ब्लक गर्नुहोस्',
  Unblock: 'अनब्लक गर्नुहोस्',
  'No chats yet.': 'अहिलेसम्म कुनै च्याट छैन।',
  'Is this still available?': 'के यो अझै उपलब्ध छ?',
  'What is your lowest price?': 'तपाईंको न्यूनतम मूल्य कति हो?',
  'Can we meet in a public place?': 'के हामी सार्वजनिक ठाउँमा भेट्न सक्छौं?',
  'Can I see more photos?': 'के म थप तस्बिरहरू हेर्न सक्छु?',
  'Is the price negotiable?': 'के मूल्य मोलमोलाई हुन्छ?',
  // profile and reviews
  Reviews: 'समीक्षाहरू',
  'Leave a review': 'समीक्षा लेख्नुहोस्',
  Rating: 'रेटिङ',
  Comment: 'टिप्पणी',
  'Active ads': 'सक्रिय विज्ञापन',
  'Sold ads': 'बिक्री भएका',
  Name: 'नाम',
  'Phone number': 'फोन नम्बर',
  Email: 'इमेल',
  Password: 'पासवर्ड',
  'Log in with email': 'इमेलबाट लग इन',
  'Create an account': 'खाता बनाउनुहोस्',
  'Sign up': 'साइन अप',
  // my ads
  'Saved ads': 'सेभ गरिएका विज्ञापन',
  'Saved searches': 'सेभ गरिएका खोजी',
  Stats: 'तथ्यांक',
  // notifications
  'Mark all as read': 'सबै पढिसकेको जनाउनुहोस्',
  'No notifications yet.': 'अहिलेसम्म कुनै सूचना छैन।',
  // footer and info
  Help: 'सहायता',
  Terms: 'सर्तहरू',
  Privacy: 'गोपनीयता',
  'Contact us': 'सम्पर्क गर्नुहोस्',
};

const pretty = (key) => String(key).replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());

const I18nContext = createContext({ lang: 'en', setLang: () => {}, t: (s) => s, label: pretty });

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem('lang') === 'ne' ? 'ne' : 'en';
    } catch {
      return 'en';
    }
  });

  const setLang = (next) => {
    setLangState(next);
    try {
      localStorage.setItem('lang', next);
    } catch {
      // storage can be blocked; the choice then lasts until the page closes
    }
  };

  // t('English text') -> Nepali text when the Nepali version is chosen and known.
  const t = (s) => (lang === 'ne' && NE[s]) || s;
  // label('shop-office') -> a readable name, translated when we have one.
  const label = (key) => (lang === 'ne' && NE[key]) || pretty(key);

  return <I18nContext.Provider value={{ lang, setLang, t, label }}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
