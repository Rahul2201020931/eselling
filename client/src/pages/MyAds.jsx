import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';
import { adState, daysLeft, formatPrice } from '../format.js';
import ListingCard from '../components/ListingCard.jsx';

const AD_TABS = ['active', 'pending', 'inactive', 'sold', 'expired'];
const TAB_NAMES = { active: 'Active', pending: 'Pending', inactive: 'Hidden', sold: 'Sold', expired: 'Expired' };

function AdRow({ ad, onChange }) {
  const { t } = useI18n();
  const [message, setMessage] = useState('');
  const state = adState(ad);
  const left = daysLeft(ad.expiresAt);

  const act = async (fn, ok) => {
    setMessage('');
    try {
      await fn();
      if (ok) setMessage(ok);
      onChange();
    } catch (e) {
      setMessage(e.message);
    }
  };

  return (
    <div className="ad-row">
      <Link to={`/listings/${ad._id}`} className="ad-thumb">
        {ad.images?.[0] ? <img src={ad.images[0].url} alt="" /> : <div className="noimg" />}
      </Link>
      <div className="ad-main">
        <Link to={`/listings/${ad._id}`}>
          <strong>{ad.title}</strong>
        </Link>
        <span>{formatPrice(ad.price)}</span>
        <small className="muted">
          {state === 'active' && left !== null ? `Expires in ${left} days · ` : ''}
          {ad.stats.views} {t('Views').toLowerCase()} · {ad.stats.favorites} {t('Saves').toLowerCase()} · {ad.stats.chats} chats
        </small>
        {ad.moderationNote && <small className="error">{ad.moderationNote}</small>}
        {message && <small className="notice">{message}</small>}
      </div>
      <div className="ad-actions">
        <Link className="button secondary small" to={`/listings/${ad._id}/edit`}>
          {t('Edit')}
        </Link>
        {['active', 'expired', 'inactive'].includes(state) && (
          <button className="secondary small" onClick={() => act(() => api.post(`/listings/${ad._id}/renew`), 'Renewed')}>
            {t('Renew')}
          </button>
        )}
        {state === 'active' && (
          <>
            <button className="secondary small" onClick={() => act(() => api.patch(`/listings/${ad._id}/status`, { status: 'inactive' }))}>
              {t('Hide')}
            </button>
            <button className="secondary small" onClick={() => act(() => api.patch(`/listings/${ad._id}/status`, { status: 'sold' }))}>
              {t('Mark as sold')}
            </button>
          </>
        )}
        {['inactive', 'sold'].includes(state) && (
          <button className="secondary small" onClick={() => act(() => api.patch(`/listings/${ad._id}/status`, { status: 'active' }))}>
            {t('Show again')}
          </button>
        )}
        <button
          className="danger small"
          onClick={() => window.confirm('Delete this ad?') && act(() => api.del(`/listings/${ad._id}`))}
        >
          {t('Delete')}
        </button>
      </div>
    </div>
  );
}

function SavedSearches() {
  const { t } = useI18n();
  const [items, setItems] = useState(null);
  const load = useCallback(() => api.get('/saved-searches').then((d) => setItems(d.items)).catch(() => setItems([])), []);
  useEffect(() => {
    load();
  }, [load]);

  if (!items) return <p className="muted">{t('Loading...')}</p>;
  if (items.length === 0) return <p className="muted">No saved searches yet. Search for something on the home page, then use "{t('Save this search')}".</p>;

  return (
    <ul className="saved-list">
      {items.map((s) => (
        <li key={s._id} className="saved-row">
          <div>
            <strong>{s.name}</strong>
            <br />
            <small className="muted">
              {Object.entries(s.params)
                .map(([k, v]) => `${k}: ${v}`)
                .join(' · ')}
            </small>
          </div>
          <div className="ad-actions">
            <Link className="button secondary small" to={`/?${new URLSearchParams(s.params)}`}>
              Open
            </Link>
            <label className="check inline">
              <input
                type="checkbox"
                checked={s.alerts}
                onChange={async (e) => {
                  await api.patch(`/saved-searches/${s._id}`, { alerts: e.target.checked });
                  load();
                }}
              />
              Alerts
            </label>
            <button
              className="danger small"
              onClick={async () => {
                await api.del(`/saved-searches/${s._id}`);
                load();
              }}
            >
              {t('Delete')}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function MyAds() {
  const { t } = useI18n();
  const [tab, setTab] = useState('active');
  const [mine, setMine] = useState(null);
  const [saved, setSaved] = useState(null);

  const loadMine = useCallback(() => api.get('/listings/mine').then((d) => setMine(d.items)).catch(() => setMine([])), []);
  useEffect(() => {
    loadMine();
    api.get('/favorites').then((d) => setSaved(d.items)).catch(() => setSaved([]));
  }, [loadMine]);

  const inTab = (name) => (mine ?? []).filter((a) => adState(a) === name);

  return (
    <>
      <h1>{t('My ads')}</h1>
      <div className="tabs wrap">
        {AD_TABS.map((name) => (
          <button key={name} className={tab === name ? '' : 'secondary'} onClick={() => setTab(name)}>
            {t(TAB_NAMES[name])} ({inTab(name).length})
          </button>
        ))}
        <button className={tab === 'saved' ? '' : 'secondary'} onClick={() => setTab('saved')}>
          {t('Saved ads')} ({saved?.length ?? 0})
        </button>
        <button className={tab === 'searches' ? '' : 'secondary'} onClick={() => setTab('searches')}>
          {t('Saved searches')}
        </button>
      </div>

      {AD_TABS.includes(tab) && (
        <>
          {!mine && <p className="muted">{t('Loading...')}</p>}
          {mine && inTab(tab).length === 0 && (
            <p className="muted">
              Nothing here. {tab === 'active' && <Link to="/post">{t('Post an ad')}</Link>}
            </p>
          )}
          {inTab(tab).map((ad) => (
            <AdRow key={ad._id} ad={ad} onChange={loadMine} />
          ))}
        </>
      )}

      {tab === 'saved' && (
        <>
          {saved?.length === 0 && <p className="muted">Tap the heart on an ad to save it here.</p>}
          <div className="grid">
            {saved?.map((item) => (
              <ListingCard key={item._id} item={item} />
            ))}
          </div>
        </>
      )}

      {tab === 'searches' && <SavedSearches />}
    </>
  );
}
