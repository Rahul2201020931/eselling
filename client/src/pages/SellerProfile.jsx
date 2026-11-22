import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { initials, timeAgo } from '../format.js';
import ListingCard from '../components/ListingCard.jsx';
import Stars from '../components/Stars.jsx';

export default function SellerProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useI18n();
  const [profile, setProfile] = useState(null);
  const [ads, setAds] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const load = useCallback(() => {
    api.get(`/users/${id}`).then(setProfile).catch((e) => setError(e.message));
    api.get(`/users/${id}/reviews`).then((d) => setReviews(d.items)).catch(() => {});
    api.get(`/listings?seller=${id}&limit=50`).then((d) => setAds(d.items)).catch(() => {});
  }, [id]);
  useEffect(load, [load]);

  if (error) return <p className="error">{error}</p>;
  if (!profile) return <p className="muted">{t('Loading...')}</p>;

  const isMe = user?.id === profile._id;

  const submitReview = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!rating) return setMessage('Choose 1 to 5 stars first.');
    try {
      await api.post(`/users/${id}/reviews`, { rating, comment: comment || undefined });
      setComment('');
      setRating(0);
      setMessage('Thanks for your review.');
      load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const toggleBlock = async () => {
    try {
      if (profile.blockedByMe) await api.del(`/users/${id}/block`);
      else await api.post(`/users/${id}/block`);
      setProfile({ ...profile, blockedByMe: !profile.blockedByMe });
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <>
      <div className="profile-head">
        <span className="avatar big">{initials(profile.name)}</span>
        <div>
          <h1>{profile.name}</h1>
          <p className="muted">
            {t('Member since')} {new Date(profile.memberSince).toLocaleDateString()}
          </p>
          <div className="badges">
            {profile.trusted && <span className="badge trusted">✓ {t('Trusted seller')}</span>}
            {profile.badges.phoneAdded && <span className="badge">Phone added</span>}
            {profile.badges.google && <span className="badge">Google account</span>}
            {profile.badges.facebook && <span className="badge">Facebook account</span>}
          </div>
          {profile.reviewCount > 0 && (
            <p>
              <Stars value={profile.avgRating} /> {profile.avgRating} ({profile.reviewCount})
            </p>
          )}
          <p className="muted">
            {profile.activeAds} {t('Active ads').toLowerCase()} · {profile.soldAds} {t('Sold ads').toLowerCase()}
          </p>
          {user && !isMe && (
            <button className="link" onClick={toggleBlock}>
              {profile.blockedByMe ? t('Unblock') : t('Block')}
            </button>
          )}
        </div>
      </div>

      <section className="section">
        <h2>{t('Active ads')}</h2>
        {ads.length === 0 && <p className="muted">No active ads.</p>}
        <div className="grid">
          {ads.map((a) => (
            <ListingCard key={a._id} item={a} />
          ))}
        </div>
      </section>

      <section className="section">
        <h2>{t('Reviews')}</h2>
        {user && !isMe && (
          <form className="form review-form" onSubmit={submitReview}>
            <strong>{t('Leave a review')}</strong>
            <Stars value={rating} onChange={setRating} />
            <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} placeholder={t('Comment')} />
            <button type="submit">{t('Send')}</button>
            <small className="muted">You can review a seller after you have chatted with them about an ad.</small>
          </form>
        )}
        {message && <p className="notice">{message}</p>}
        {reviews.length === 0 && <p className="muted">No reviews yet.</p>}
        {reviews.map((r) => (
          <div key={r._id} className="review">
            <span className="avatar">{initials(r.reviewer?.name)}</span>
            <div>
              <strong>{r.reviewer?.name ?? 'Deleted user'}</strong> <Stars value={r.rating} />
              <small className="muted"> {timeAgo(r.createdAt)}</small>
              {r.comment && <p>{r.comment}</p>}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
