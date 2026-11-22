import { Link, useParams } from 'react-router-dom';
import { useI18n } from '../i18n.jsx';

// Edit the contact details before launch.
const CONTACT_EMAIL = 'support@example.com';

const PAGES = {
  safety: {
    title: 'Safety tips',
    body: (
      <>
        <h2>Buying</h2>
        <ul>
          <li>Meet in a busy public place, in daylight, and bring a friend if you can.</li>
          <li>Check the item carefully before you pay. Test phones, laptops and vehicles.</li>
          <li>Never pay in advance, not even a "booking" or "delivery" amount, for something you have not seen.</li>
          <li>If the price looks too good to be true, it usually is.</li>
          <li>For vehicles and land, check the ownership papers and the seller's identity.</li>
        </ul>
        <h2>Selling</h2>
        <ul>
          <li>Do not send items before you have the money in your own account. Check your account yourself; screenshots can be faked.</li>
          <li>Do not share OTP codes, passwords or QR codes. A buyer never needs them to pay you.</li>
          <li>You can turn off "Show my phone number" on an ad and use chat only.</li>
          <li>Be careful with buyers who offer extra money, or who insist on couriers and payment links.</li>
        </ul>
        <h2>On this site</h2>
        <ul>
          <li>Keep your conversation in the chat. Scammers often ask to move to another app quickly.</li>
          <li>Use the Report button on any ad that looks wrong, and Block anyone who bothers you.</li>
          <li>Look for the "Trusted seller" badge and read the reviews on a seller's profile.</li>
        </ul>
        <p>
          If you are scammed, contact the police as well as us. Nepal Police has a Cyber Bureau for online fraud; look up its current contact details on the official police website.
        </p>
      </>
    ),
  },
  help: {
    title: 'Help',
    body: (
      <>
        <h2>How do I post an ad?</h2>
        <p>Log in, press "Post an ad", fill in the form, add photos and publish. Ads are free.</p>
        <h2>How long does an ad stay online?</h2>
        <p>30 days. Then it expires and buyers no longer see it. Open My ads and press Renew to put it back on top for another 30 days. You can renew an active ad once every 7 days.</p>
        <h2>Why is my ad "Pending"?</h2>
        <p>Ads that contain certain risky words are checked by an admin first. You will get a notification when it is approved or rejected.</p>
        <h2>How do I hide my phone number?</h2>
        <p>Untick "Show my phone number on this ad" when you post or edit it. Buyers will have to use chat.</p>
        <h2>How do saved searches work?</h2>
        <p>Search, then press "Save this search". When a new ad matches, you get a notification (the bell in the top bar).</p>
        <h2>How do I review a seller?</h2>
        <p>Chat with the seller first, then open their profile and leave a rating and comment.</p>
        <h2>Does this site handle payments or delivery?</h2>
        <p>No. Buyers and sellers agree on payment and handover directly, so please read the safety tips.</p>
      </>
    ),
  },
  terms: {
    title: 'Terms of use',
    body: (
      <>
        <p className="notice">This is a starting template, not legal advice. Have it checked by a lawyer in Nepal before you launch.</p>
        <h2>1. The service</h2>
        <p>This site lets people post and browse classified ads. We do not own, sell or inspect the items, and we are not a party to any deal between users.</p>
        <h2>2. Your account</h2>
        <p>You are responsible for your account and for what you post. You must be old enough to enter into agreements where you live.</p>
        <h2>3. Rules for ads</h2>
        <p>You may only post things you are allowed to sell. Illegal items, weapons, drugs, counterfeit goods, stolen goods, human organs and adult services are not allowed. Ads must be honest and in the right category.</p>
        <h2>4. Removal</h2>
        <p>We may remove ads or suspend accounts that break these rules or that we believe are fraudulent.</p>
        <h2>5. No guarantee</h2>
        <p>We do not guarantee the quality, safety or legality of items, or the identity of users. You use the site at your own risk.</p>
        <h2>6. Changes</h2>
        <p>We may update these terms. Using the site after a change means you accept it.</p>
      </>
    ),
  },
  privacy: {
    title: 'Privacy policy',
    body: (
      <>
        <p className="notice">This is a starting template, not legal advice. Facebook and Google also require a privacy policy page, so keep this page online and accurate.</p>
        <h2>What we collect</h2>
        <p>Your name and email (from sign-up, Google or Facebook), your phone number if you add one, the ads and photos you post, your messages, and basic technical data such as your browser.</p>
        <h2>How we use it</h2>
        <p>To run the site: show your ads, let users chat, send notifications, prevent fraud and answer reports.</p>
        <h2>What others can see</h2>
        <p>Your name, profile picture and ads are public. Your phone number is shown only to logged-in users and only on ads where you chose to show it. Your email is never shown.</p>
        <h2>Location</h2>
        <p>If you pin an ad on the map, the pin is rounded to about 100 metres. "Near me" search uses your device location only when you press the button, and we do not store it.</p>
        <h2>Sharing</h2>
        <p>We do not sell your data. We use service providers (database hosting, photo storage, map tiles) to run the site.</p>
        <h2>Your choices</h2>
        <p>You can edit or delete your ads at any time. To delete your account and data, write to us at the email below.</p>
      </>
    ),
  },
  contact: {
    title: 'Contact us',
    body: (
      <>
        <p>
          Questions, problems or reports: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
        <p>To report a single ad or user, please use the Report button on the ad page, which reaches the admins directly.</p>
      </>
    ),
  },
};

export default function Info() {
  const { page } = useParams();
  const { t } = useI18n();
  const content = PAGES[page];
  if (!content) return <p>Page not found.</p>;
  return (
    <article className="info-page">
      <h1>{t(content.title)}</h1>
      {content.body}
      <p>
        <Link to="/">← Back to ads</Link>
      </p>
    </article>
  );
}
