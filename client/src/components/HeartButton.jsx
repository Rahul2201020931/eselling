import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useData } from '../data.jsx';

// The heart on ad cards and ad pages. Sends visitors who are not logged in to the login page.
export default function HeartButton({ id, className = '' }) {
  const { user } = useAuth();
  const { favIds, toggleFavorite } = useData();
  const navigate = useNavigate();
  const saved = favIds.has(id);

  return (
    <button
      type="button"
      className={`heart ${saved ? 'on' : ''} ${className}`}
      aria-label={saved ? 'Remove from saved ads' : 'Save this ad'}
      aria-pressed={saved}
      onClick={(e) => {
        e.preventDefault(); // the card around it is a link
        e.stopPropagation();
        if (!user) return navigate('/login');
        toggleFavorite(id);
      }}
    >
      {saved ? '♥' : '♡'}
    </button>
  );
}
