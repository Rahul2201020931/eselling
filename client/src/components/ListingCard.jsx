import { Link } from 'react-router-dom';
import { formatPrice, timeAgo, adState } from '../format.js';
import { useI18n } from '../i18n.jsx';
import HeartButton from './HeartButton.jsx';

export default function ListingCard({ item, showHeart = true }) {
  const { t } = useI18n();
  const state = adState(item);
  const badge = { sold: 'Sold', expired: 'Expired', pending: 'Pending', inactive: 'Hidden' }[state];

  return (
    <Link to={`/listings/${item._id}`} className="card">
      <div className="card-img">
        {item.images?.[0] ? <img src={item.images[0].url} alt={item.title} loading="lazy" /> : <div className="noimg">No photo</div>}
        {badge && <span className="badge floating">{t(badge)}</span>}
        {showHeart && <HeartButton id={item._id} className="card-heart" />}
      </div>
      <div className="card-body">
        <strong>{formatPrice(item.price)}</strong>
        <span className="card-title">{item.title}</span>
        <small className="muted">
          {item.location?.district}
          {item.refreshedAt ? ` · ${timeAgo(item.refreshedAt)}` : ''}
        </small>
      </div>
    </Link>
  );
}
