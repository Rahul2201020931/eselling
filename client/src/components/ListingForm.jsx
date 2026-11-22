import { useState } from 'react';
import { uploadImage } from '../api.js';
import { useData } from '../data.jsx';
import { useI18n } from '../i18n.jsx';
import DistrictSelect from './DistrictSelect.jsx';
import { LazyMapPicker } from './LazyMap.jsx';

export const EMPTY_FORM = {
  title: '',
  description: '',
  category: 'electronics',
  subcategory: 'mobile',
  price: '',
  priceType: 'negotiable',
  condition: 'used',
  district: '',
  area: '',
  attributes: {},
  showPhone: true,
  pin: null,
};

// Turn a listing from the API into the flat shape the form fields use.
export function formFromListing(l) {
  return {
    title: l.title,
    description: l.description || '',
    category: l.category,
    subcategory: l.subcategory || 'other',
    price: String(l.price),
    priceType: l.priceType,
    condition: l.condition,
    district: l.location?.district || '',
    area: l.location?.area || '',
    attributes: l.attributes || {},
    showPhone: l.showPhone !== false,
    pin: l.pin || null,
  };
}

// The form used for both posting a new ad and editing an existing one.
// onSubmit gets the finished payload and should throw if saving fails.
export default function ListingForm({ initial = EMPTY_FORM, initialImages = [], submitLabel, onSubmit }) {
  const { meta } = useData();
  const { t, label } = useI18n();
  const [form, setForm] = useState(initial);
  const [images, setImages] = useState(initialImages);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const tree = meta?.categoryTree;
  const fields = tree?.[form.category]?.fields ?? [];

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const setAttr = (key, value) => setForm({ ...form, attributes: { ...form.attributes, [key]: value } });

  // Changing the category resets what depends on it.
  const changeCategory = (e) => {
    const category = e.target.value;
    setForm({ ...form, category, subcategory: tree?.[category]?.subcategories[0] ?? 'other', attributes: {} });
  };

  const onFiles = async (e) => {
    setError('');
    setBusy(true);
    try {
      const uploaded = [];
      for (const file of [...e.target.files].slice(0, 8 - images.length)) {
        uploaded.push(await uploadImage(file));
      }
      setImages([...images, ...uploaded]);
    } catch (err) {
      setError(err.message);
    } finally {
      e.target.value = '';
      setBusy(false);
    }
  };

  const removeImage = (url) => setImages(images.filter((img) => img.url !== url));
  // The first photo is the cover, so any photo can be made first.
  const makeCover = (url) => setImages([images.find((i) => i.url === url), ...images.filter((i) => i.url !== url)]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onSubmit({
        title: form.title,
        description: form.description,
        category: form.category,
        subcategory: form.subcategory,
        price: form.price,
        priceType: form.priceType,
        condition: form.condition,
        images,
        location: { district: form.district, area: form.area || undefined },
        attributes: form.attributes,
        showPhone: form.showPhone,
        pin: form.pin,
      });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form className="form" onSubmit={submit}>
      <label>
        {t('Title')}
        <input value={form.title} onChange={set('title')} required minLength={3} maxLength={120} />
      </label>
      <div className="row2">
        <label>
          {t('Category')}
          <select value={form.category} onChange={changeCategory}>
            {meta?.categories.map((c) => (
              <option key={c} value={c}>
                {label(c)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('Subcategory')}
          <select value={form.subcategory} onChange={set('subcategory')}>
            {tree?.[form.category]?.subcategories.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {fields.length > 0 && (
        <fieldset className="attrs">
          <legend>{label(form.category)} details</legend>
          <div className="row2">
            {fields.map((f) => (
              <label key={f.key}>
                {f.label}
                {f.type === 'select' ? (
                  <select value={form.attributes[f.key] ?? ''} onChange={(e) => setAttr(f.key, e.target.value)}>
                    <option value="">-</option>
                    {f.options.map((o) => (
                      <option key={o} value={o}>
                        {label(o)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type === 'number' ? 'number' : 'text'}
                    min={f.type === 'number' ? 0 : undefined}
                    value={form.attributes[f.key] ?? ''}
                    onChange={(e) => setAttr(f.key, e.target.value)}
                    maxLength={f.type === 'text' ? 100 : undefined}
                  />
                )}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="row2">
        <label>
          {t('Price (Rs.)')}
          <input type="number" min="0" value={form.price} onChange={set('price')} required />
        </label>
        <label>
          {t('Price type')}
          <select value={form.priceType} onChange={set('priceType')}>
            {meta?.priceTypes.map((c) => (
              <option key={c} value={c}>
                {t(c)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        {t('Condition')}
        <select value={form.condition} onChange={set('condition')}>
          {meta?.conditions.map((c) => (
            <option key={c} value={c}>
              {t(c)}
            </option>
          ))}
        </select>
      </label>
      <div className="row2">
        <label>
          {t('District')}
          <DistrictSelect value={form.district} onChange={(district) => setForm({ ...form, district })} allLabel="Select a district" required />
        </label>
        <label>
          {t('Area / tole')}
          <input value={form.area} onChange={set('area')} maxLength={100} />
        </label>
      </div>
      <label>
        {t('Description')}
        <textarea rows={6} value={form.description} onChange={set('description')} maxLength={4000} />
      </label>

      <label>
        {t('Photos (up to 8)')}
        <input type="file" accept="image/*" multiple onChange={onFiles} disabled={busy || images.length >= 8} />
      </label>
      <div className="thumbs">
        {images.map((img, i) => (
          <div className="thumb" key={img.url}>
            <img src={img.url} alt="" />
            {i === 0 ? (
              <span className="thumb-cover">Cover</span>
            ) : (
              <button type="button" className="thumb-cover link" onClick={() => makeCover(img.url)}>
                Make cover
              </button>
            )}
            <button type="button" className="thumb-remove" onClick={() => removeImage(img.url)} aria-label="Remove photo">
              ×
            </button>
          </div>
        ))}
      </div>

      <label className="check">
        <input type="checkbox" checked={form.showPhone} onChange={(e) => setForm({ ...form, showPhone: e.target.checked })} />
        {t('Show my phone number on this ad')}
      </label>
      {!form.showPhone && <p className="muted small-text">Buyers will only be able to reach you by chat.</p>}

      <div className="field">
        <span className="field-title">{t('Pin the location on the map (optional)')}</span>
        <p className="muted small-text">The pin is rounded to about 100 m, so your exact door is not shown.</p>
        <LazyMapPicker value={form.pin} onChange={(pin) => setForm({ ...form, pin })} />
      </div>

      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={busy}>
        {busy ? t('Please wait...') : submitLabel}
      </button>
    </form>
  );
}
