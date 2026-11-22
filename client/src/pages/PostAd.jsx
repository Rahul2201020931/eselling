import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';
import ListingForm from '../components/ListingForm.jsx';

export default function PostAd() {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <>
      <h1>{t('Post an ad')}</h1>
      <ListingForm
        submitLabel={t('Publish ad')}
        onSubmit={async (payload) => {
          const listing = await api.post('/listings', payload);
          navigate(`/listings/${listing._id}`);
        }}
      />
    </>
  );
}
