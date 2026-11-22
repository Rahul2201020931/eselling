import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useData } from '../data.jsx';
import { useI18n } from '../i18n.jsx';
import { adState, daysLeft, formatPrice, initials, rememberListing, timeAgo } from '../format.js';
import HeartButton from '../components/HeartButton.jsx';
import ListingCard from '../components/ListingCard.jsx';
import ShareButtons from '../components/ShareButtons.jsx';
import Stars from '../components/Stars.jsx';
import { LazyMapView } from '../components/LazyMap.jsx';

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { meta } = useData();
  const { t, label } = useI18n();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [contact, setContact] = useState(null);
  const [photo, setPhoto] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    setListing(null);
    setContact(null);
    setPhoto(0);
    setError('');
    api
      .get(`/listings/${id}`)
      .then((l) => {
        setListing(l);
        rememberListing(l);
      })
      .catch((e) => setError(e.message));
    api.get(`/listings/${id}/similar`).then((d) => setSimilar(d.items)).catch(() => setSimilar([]));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!listing) return <p className="muted">{t('Loading...')}</p>;

  const isOwner = user && listing.seller?._id === user.id;
  const isAdmin = user?.role === 'admin';
  const state = adState(listing);
  const fields = meta?.categoryTree[listing.category]?.fields ?? [];
  const left = daysLeft(listing.expiresAt);

  const run = async (fn, okMessage) => {
    setMessage('');
    try {
      await fn();
      if (okMessage) setMessage(okMessage);
    } catch (e) {
      setMessage(e.message);
    }
  };

  const startChat = () =>
    run(async () => {
      const { id: chatId } = await api.post('/chats', { listingId: id });
      navigate(`/chats/${chatId}`);
    });

  const showPhone = () =>
    run(async () => {
      try {
        setContact(await api.get(`/listings/${id}/contact`));
      } catch (e) {
        if (e.data?.chatOnly) setMessage(e.message);
        else throw e;
      }
    });

  // After a change, load the ad again so the page shows exactly what the server now has.
  const reload = async () => setListing(await api.get(`/listings/${id}`));
  const changeStatus = (status) =>
    run(async () => {
      await api.patch(`/listings/${id}/status`, { status });
      await reload();
    });
  const renew = () =>
    run(async () => {
      await api.post(`/listings/${id}/renew`);
      await reload();
    }, 'Renewed for another 30 days');

  const sendReport = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await run(() => api.post(`/listings/${id}/report`, { reason: form.get('reason'), note: form.get('note') || undefined }), 'Thanks, we will review this ad.');
    setReporting(false);
  };

  return (
    <article className="detail">
      <div className="photos">
        {listing.images.length === 0 ? (
          <div className="noimg big">No photo</div>
        ) : (
          <>
            <img className="main-photo" src={listing.images[photo]?.url} alt={listing.title} />
            {listing.images.length > 1 && (
              <div className="thumbs">
                {listing.images.map((img, i) => (
                  <button key={img.url} type="button" className={`thumb-btn ${i === photo ? 'on' : ''}`} onClick={() => setPhoto(i)}>
                    <img src={img.url} alt="" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        {listing.pin && (
          <div className="field">
            <span className="field-title">{t('Approximate location')}</span>
            <LazyMapView pin={listing.pin} />
          </div>
        )}
      </div>

      <div className="info">
        {state !== 'active' && <p className={`banner ${state}`}>{t({ sold: 'Sold', expired: 'Expired', pending: 'Pending', inactive: 'Hidden', removed: 'Removed' }[state] || state)}</p>}
        {listing.moderationNote && <p className="notice">{listing.moderationNote}</p>}
        {state === 'pending' && <p className="notice">An admin is checking this ad. You will get a notification when it is approved.</p>}

        <div className="title-row">
          <h1>{listing.title}</h1>
          <HeartButton id={listing._id} className="big" />
        </div>
        <p className="price">
          {formatPrice(listing.price)} <small>({t(listing.priceType)})</small>
        </p>
        <p className="muted">
          {label(listing.category)} › {label(listing.subcategory)} · {t(listing.condition)} · {listing.location.district}
          {listing.location.area ? `, ${listing.location.area}` : ''} · {timeAgo(listing.refreshedAt || listing.createdAt)}
        </p>
        <p className="muted small-text">
          {listing.views} {t('Views').toLowerCase()} · {listing.favoritesCount} {t('Saves').toLowerCase()}
        </p>

        {fields.some((f) => listing.attributes?.[f.key] !== undefined) && (
          <dl>
            {fields
              .filter((f) => listing.attributes?.[f.key] !== undefined)
              .map((f) => (
                <div key={f.key}>
                  <dt>{f.label}</dt>
                  <dd>{f.type === 'select' ? label(String(listing.attributes[f.key])) : String(listing.attributes[f.key])}</dd>
                </div>
              ))}
          </dl>
        )}

        <h3>{t('Description')}</h3>
        <p className="description">{listing.description || '-'}</p>

        {listing.seller && (
          <Link to={`/u/${listing.seller._id}`} className="seller-card">
            <span className="avatar">{initials(listing.seller.name)}</span>
            <span>
              <strong>{listing.seller.name}</strong>
              <br />
              <small className="muted">
                {t('Member since')} {new Date(listing.seller.createdAt).toLocaleDateString()}
              </small>
              <br />
              {listing.sellerStats?.trusted && <span className="badge trusted">✓ {t('Trusted seller')}</span>}{' '}
              {listing.sellerStats?.reviewCount > 0 && (
                <small>
                  <Stars value={listing.sellerStats.avgRating} /> {listing.sellerStats.avgRating} ({listing.sellerStats.reviewCount})
                </small>
              )}
            </span>
          </Link>
        )}

        {!isOwner && state === 'active' && (
          <div className="actions">
            {user ? (
              <button onClick={startChat}>{t('Chat with seller')}</button>
            ) : (
              <Link className="button" to="/login">
                {t('Log in to chat')}
              </Link>
            )}
            {listing.showPhone ? (
              contact ? (
                <p className="contact">
                  {contact.name}: <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                </p>
              ) : user ? (
                <button className="secondary" onClick={showPhone}>
                  {t('Show phone number')}
                </button>
              ) : null
            ) : (
              <span className="muted small-text">{t('This seller only accepts chat messages')}</span>
            )}
          </div>
        )}

        {isOwner && (
          <div className="owner-box">
            {state === 'expired' && <p className="notice">This ad has expired and is no longer shown to buyers. Renew it to show it again.</p>}
            {state === 'active' && left !== null && <p className="muted small-text">Expires in {left} days</p>}
            <div className="actions">
              <Link className="button secondary" to={`/listings/${id}/edit`}>
                {t('Edit')}
              </Link>
              {['active', 'expired', 'inactive'].includes(state) && (
                <button className="secondary" onClick={renew}>
                  {t('Renew')}
                </button>
              )}
              {state === 'active' && (
                <button className="secondary" onClick={() => changeStatus('inactive')}>
                  {t('Hide')}
                </button>
              )}
              {['inactive', 'sold'].includes(state) && (
                <button className="secondary" onClick={() => changeStatus('active')}>
                  {t('Show again')}
                </button>
              )}
              {state === 'active' && (
                <button className="secondary" onClick={() => changeStatus('sold')}>
                  {t('Mark as sold')}
                </button>
              )}
              <button
                className="danger"
                onClick={async () => {
                  if (!window.confirm('Delete this ad?')) return;
                  await run(() => api.del(`/listings/${id}`));
                  navigate('/my-ads');
                }}
              >
                {t('Delete')}
              </button>
            </div>
          </div>
        )}

        {!isOwner && isAdmin && (
          <div className="actions">
            <Link className="button secondary" to={`/listings/${id}/edit`}>
              {t('Edit')} (admin)
            </Link>
          </div>
        )}

        <ShareButtons title={listing.title} path={`/listings/${id}`} />

        {user && !isOwner && (
          <div className="report-box">
            {reporting ? (
              <form onSubmit={sendReport} className="inline-form">
                <select name="reason" required defaultValue="">
                  <option value="" disabled>
                    Why are you reporting this ad?
                  </option>
                  {meta?.reportReasons.map((r) => (
                    <option key={r} value={r}>
                      {label(r)}
                    </option>
                  ))}
                </select>
                <input name="note" placeholder="Tell us more (optional)" maxLength={1000} />
                <button type="submit" className="danger small">
                  {t('Report')}
                </button>
                <button type="button" className="secondary small" onClick={() => setReporting(false)}>
                  Cancel
                </button>
              </form>
            ) : (
              <button className="link" onClick={() => setReporting(true)}>
                {t('Report')}
              </button>
            )}
          </div>
        )}
        {message && <p className="notice">{message}</p>}

        <p className="safety">
          {t('Safety')}: {t('Meet in a public place, check the item before paying, and never send money in advance.')}{' '}
          <Link to="/info/safety">{t('Safety tips')}</Link>
        </p>
      </div>

      {similar.length > 0 && (
        <section className="section full">
          <h2>{t('Similar ads')}</h2>
          <div className="grid">
            {similar.map((s) => (
              <ListingCard key={s._id} item={s} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
