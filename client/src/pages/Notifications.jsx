import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useData } from '../data.jsx';
import { useI18n } from '../i18n.jsx';
import { timeAgo } from '../format.js';

export default function Notifications() {
  const { t } = useI18n();
  const { setUnreadNotifs, refreshCounts } = useData();
  const navigate = useNavigate();
  const [items, setItems] = useState(null);

  useEffect(() => {
    api.get('/notifications').then((d) => setItems(d.items)).catch(() => setItems([]));
  }, []);

  const open = async (n) => {
    if (!n.readAt) {
      await api.patch(`/notifications/${n._id}/read`).catch(() => {});
      refreshCounts();
    }
    if (n.link) navigate(n.link);
  };

  const readAll = async () => {
    await api.post('/notifications/read-all');
    setItems(items.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
    setUnreadNotifs(0);
  };

  return (
    <>
      <div className="title-row">
        <h1>{t('Notifications')}</h1>
        {items?.some((n) => !n.readAt) && (
          <button className="secondary" onClick={readAll}>
            {t('Mark all as read')}
          </button>
        )}
      </div>
      {!items && <p className="muted">{t('Loading...')}</p>}
      {items?.length === 0 && <p className="muted">{t('No notifications yet.')}</p>}
      <ul className="notif-list">
        {items?.map((n) => (
          <li key={n._id}>
            <button className={`notif ${n.readAt ? '' : 'unread'}`} onClick={() => open(n)}>
              <strong>{n.title}</strong>
              {n.body && <span>{n.body}</span>}
              <small className="muted">{timeAgo(n.createdAt)}</small>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
