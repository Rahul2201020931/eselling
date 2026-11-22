import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import ListingForm, { formFromListing } from '../components/ListingForm.jsx';

export default function EditAd() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/listings/${id}`).then(setListing).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!listing) return <p className="muted">{t('Loading...')}</p>;

  // The server checks this too; this only avoids showing a form that would fail.
  const canEdit = listing.seller?._id === user.id || user.role === 'admin';
  if (!canEdit) return <p className="error">You can only edit your own ads.</p>;

  return (
    <>
      <h1>{t('Edit')}</h1>
      <ListingForm
        initial={formFromListing(listing)}
        initialImages={listing.images}
        submitLabel={t('Save changes')}
        onSubmit={async (payload) => {
          await api.put(`/listings/${id}`, payload);
          navigate(`/listings/${id}`);
        }}
      />
    </>
  );
}
