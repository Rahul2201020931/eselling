import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';

export default function Profile() {
  const { user, setUser } = useAuth();
  const { t } = useI18n();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [message, setMessage] = useState('');
  const [blocked, setBlocked] = useState([]);

  const loadBlocked = useCallback(() => api.get('/users/blocked/list').then((d) => setBlocked(d.items)).catch(() => {}), []);
  useEffect(() => {
    loadBlocked();
  }, [loadBlocked]);

  const save = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const body = { name };
      if (phone) body.phone = phone;
      setUser(await api.patch('/auth/me', body));
      setMessage('Saved');
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <>
      <form className="form narrow" onSubmit={save}>
        <h1>{t('Profile')}</h1>
        <label>
          {t('Name')}
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
        </label>
        <label>
          {t('Phone number')}
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98XXXXXXXX" />
        </label>
        <p className="muted small-text">Shown only to logged-in users, and only on ads where you keep "Show my phone number" ticked. Buyers can always reach you by chat.</p>
        <p className="muted">
          {t('Email')}: {user.email || 'not provided by your login method'}
        </p>
        {message && <p className="notice">{message}</p>}
        <button type="submit">{t('Save')}</button>
        <p>
          <Link to={`/u/${user.id}`}>See how your public profile looks</Link>
        </p>
      </form>

      {blocked.length > 0 && (
        <section className="form narrow">
          <h2>Blocked people</h2>
          {blocked.map((b) => (
            <div key={b._id} className="saved-row">
              <span>{b.name}</span>
              <button
                className="secondary small"
                onClick={async () => {
                  await api.del(`/users/${b._id}/block`);
                  loadBlocked();
                }}
              >
                {t('Unblock')}
              </button>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
