import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useData } from '../data.jsx';
import { useI18n } from '../i18n.jsx';
import { recentListings } from '../format.js';
import DistrictSelect from '../components/DistrictSelect.jsx';
import ListingCard from '../components/ListingCard.jsx';

export default function Home() {
  const [params, setParams] = useSearchParams();
  const { meta } = useData();
  const { user } = useAuth();
  const { t, label } = useI18n();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const recent = recentListings();

  const query = params.toString();
  useEffect(() => {
    setError('');
    api
      .get(`/listings?${query}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [query]);

  // Change several filters at once in the address bar; the effect above reloads the list.
  const update = (changes) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === '' || value === undefined || value === null) next.delete(key);
      else next.set(key, String(value));
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };
  const setFilter = (key, value) => update({ [key]: value });
  const get = (key) => params.get(key) || '';

  const category = get('category');
  const categoryFields = category ? (meta?.categoryTree[category]?.fields.filter((f) => f.filterable) ?? []) : [];
  const page = Number(get('page') || 1);
  const hasFilters = [...params.keys()].some((k) => k !== 'page' && k !== 'sort');

  const pickCategory = (c) => {
    // attribute filters belong to one category, so they are cleared when it changes
    const cleared = {};
    for (const k of params.keys()) if (k.startsWith('attr.')) cleared[k] = '';
    update({ category: c, subcategory: '', ...cleared });
  };

  const nearMe = () =>
    navigator.geolocation?.getCurrentPosition(
      (pos) => update({ lat: pos.coords.latitude.toFixed(4), lng: pos.coords.longitude.toFixed(4), radiusKm: get('radiusKm') || 25 }),
      () => setMessage('Could not get your location. Check that location access is allowed for this site.')
    );

  const saveSearch = async () => {
    if (!user) return navigate('/login');
    const name = window.prompt('Name this search', get('q') || (category ? label(category) : 'My search'));
    if (!name) return;
    const saved = {};
    for (const k of ['q', 'category', 'subcategory', 'province', 'district', 'condition', 'minPrice', 'maxPrice', 'withPhotos']) {
      if (get(k)) saved[k] = get(k);
    }
    try {
      await api.post('/saved-searches', { name, params: saved });
      setMessage('Search saved. You will get a notification when a matching ad is posted.');
    } catch (e) {
      setMessage(e.message);
    }
  };

  return (
    <>
      <form
        className="searchbar"
        onSubmit={(e) => {
          e.preventDefault();
          setFilter('q', new FormData(e.currentTarget).get('q').trim());
        }}
      >
        <input name="q" key={get('q')} defaultValue={get('q')} placeholder={t('Search for anything...')} />
        <button type="submit">{t('Search')}</button>
        <button type="button" className="secondary filter-toggle" onClick={() => setShowFilters(!showFilters)}>
          {t('Filters')}
        </button>
      </form>

      <div className="chips">
        <button className={`chip ${category ? '' : 'on'}`} onClick={() => pickCategory('')}>
          {t('All')}
        </button>
        {meta?.categories.map((c) => (
          <button key={c} className={`chip ${category === c ? 'on' : ''}`} onClick={() => pickCategory(c)}>
            {label(c)}
          </button>
        ))}
      </div>

      <div className={`filters ${showFilters ? 'open' : ''}`}>
        {category && (
          <select value={get('subcategory')} onChange={(e) => setFilter('subcategory', e.target.value)}>
            <option value="">{t('All subcategories')}</option>
            {meta?.categoryTree[category].subcategories.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
        )}
        <select
          value={get('province')}
          onChange={(e) => update({ province: e.target.value, district: '' })}
        >
          <option value="">{t('All provinces')}</option>
          {meta?.provinces.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <DistrictSelect value={get('district')} onChange={(d) => setFilter('district', d)} />
        <input type="number" min="0" placeholder={t('Min price')} value={get('minPrice')} onChange={(e) => setFilter('minPrice', e.target.value)} />
        <input type="number" min="0" placeholder={t('Max price')} value={get('maxPrice')} onChange={(e) => setFilter('maxPrice', e.target.value)} />
        <select value={get('condition')} onChange={(e) => setFilter('condition', e.target.value)}>
          <option value="">{t('Any condition')}</option>
          {meta?.conditions.map((c) => (
            <option key={c} value={c}>
              {t(c)}
            </option>
          ))}
        </select>
        <select value={get('postedWithin')} onChange={(e) => setFilter('postedWithin', e.target.value)}>
          <option value="">{t('Posted: any time')}</option>
          <option value="1">{t('Last 24 hours')}</option>
          <option value="7">{t('Last 7 days')}</option>
          <option value="30">{t('Last 30 days')}</option>
        </select>

        {categoryFields.map((f) =>
          f.type === 'number' ? (
            <div className="range" key={f.key}>
              <input type="number" min="0" placeholder={`${f.label} min`} value={get(`attr.${f.key}.min`)} onChange={(e) => setFilter(`attr.${f.key}.min`, e.target.value)} />
              <input type="number" min="0" placeholder={`${f.label} max`} value={get(`attr.${f.key}.max`)} onChange={(e) => setFilter(`attr.${f.key}.max`, e.target.value)} />
            </div>
          ) : f.type === 'select' ? (
            <select key={f.key} value={get(`attr.${f.key}`)} onChange={(e) => setFilter(`attr.${f.key}`, e.target.value)}>
              <option value="">{f.label}: any</option>
              {f.options.map((o) => (
                <option key={o} value={o}>
                  {label(o)}
                </option>
              ))}
            </select>
          ) : (
            <input key={f.key} placeholder={f.label} value={get(`attr.${f.key}`)} onChange={(e) => setFilter(`attr.${f.key}`, e.target.value)} />
          )
        )}

        <label className="check inline">
          <input type="checkbox" checked={get('withPhotos') === 'true'} onChange={(e) => setFilter('withPhotos', e.target.checked ? 'true' : '')} />
          {t('With photos only')}
        </label>

        {get('lat') ? (
          <div className="range">
            <select value={get('radiusKm') || '25'} onChange={(e) => setFilter('radiusKm', e.target.value)}>
              {[5, 10, 25, 50, 100].map((r) => (
                <option key={r} value={r}>
                  {t('Near me')}: {r} km
                </option>
              ))}
            </select>
            <button type="button" className="secondary" onClick={() => update({ lat: '', lng: '', radiusKm: '' })}>
              {t('Clear location')}
            </button>
          </div>
        ) : (
          <button type="button" className="secondary" onClick={nearMe}>
            {t('Near me')}
          </button>
        )}
      </div>

      <div className="resultbar">
        <span className="muted">{data ? `${data.total} ads` : ''}</span>
        <div className="resultbar-actions">
          {hasFilters && (
            <>
              <button className="link" onClick={saveSearch}>
                {t('Save this search')}
              </button>
              <button className="link" onClick={() => setParams(new URLSearchParams())}>
                {t('Clear filters')}
              </button>
            </>
          )}
          <select value={get('sort') || 'newest'} onChange={(e) => setFilter('sort', e.target.value)}>
            <option value="newest">{t('Newest')}</option>
            {get('q') && <option value="relevance">{t('Relevance')}</option>}
            <option value="price_asc">{t('Price: low to high')}</option>
            <option value="price_desc">{t('Price: high to low')}</option>
          </select>
        </div>
      </div>

      {message && <p className="notice">{message}</p>}
      {error && <p className="error">{error}</p>}
      {!data && !error && <p className="muted">{t('Loading...')}</p>}
      {data && data.items.length === 0 && <p className="muted">{t('No ads found. Try different filters.')}</p>}

      <div className="grid">
        {data?.items.map((item) => (
          <ListingCard key={item._id} item={item} />
        ))}
      </div>

      {data && data.pages > 1 && (
        <div className="pager">
          <button disabled={page <= 1} onClick={() => update({ page: page - 1 })}>
            {t('Previous')}
          </button>
          <span>
            {data.page} / {data.pages}
          </span>
          <button disabled={page >= data.pages} onClick={() => update({ page: page + 1 })}>
            {t('Next')}
          </button>
        </div>
      )}

      {recent.length > 0 && !hasFilters && (
        <section className="section">
          <h2>{t('Recently viewed')}</h2>
          <div className="strip">
            {recent.map((r) => (
              <Link key={r._id} to={`/listings/${r._id}`} className="mini">
                {r.images?.[0] ? <img src={r.images[0].url} alt="" /> : <div className="noimg" />}
                <span>{r.title}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
