import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatPrice } from '../api.js';

const TABS = ['overview', 'reports', 'pending ads', 'users'];

function Overview() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api.get('/admin/stats').then(setStats).catch(() => setStats({}));
  }, []);
  if (!stats) return <p className="muted">Loading...</p>;
  const cards = [
    ['Users', stats.users],
    ['New users (24 h)', stats.newUsersToday],
    ['Active ads', stats.activeAds],
    ['New ads (24 h)', stats.newAdsToday],
    ['Pending ads', stats.pendingAds],
    ['Open reports', stats.openReports],
    ['Chats', stats.chats],
  ];
  return (
    <div className="stat-grid">
      {cards.map(([name, n]) => (
        <div className="stat" key={name}>
          <strong>{n ?? '-'}</strong>
          <span className="muted">{name}</span>
        </div>
      ))}
    </div>
  );
}

function Reports() {
  const [status, setStatus] = useState('open');
  const [reports, setReports] = useState(null);
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    setReports(null);
    api
      .get(`/admin/reports?status=${status}`)
      .then((d) => setReports(d.items))
      .catch((e) => {
        setReports([]);
        setMessage(e.message);
      });
  }, [status]);
  useEffect(load, [load]);

  // Run one admin action, then reload the list.
  const act = async (fn, okMessage) => {
    setMessage('');
    try {
      await fn();
      setMessage(okMessage);
      load();
    } catch (e) {
      setMessage(e.message);
    }
  };

  const setReportStatus = (report, next) => act(() => api.patch(`/admin/reports/${report._id}`, { status: next }), `Report marked ${next}`);

  const removeAd = (report) =>
    act(async () => {
      await api.del(`/listings/${report.listing._id}`);
      await api.patch(`/admin/reports/${report._id}`, { status: 'resolved' });
    }, 'Ad removed and report resolved');

  const banSeller = (report) => {
    if (!window.confirm('Ban the seller of this ad? They will not be able to log in and their ads are hidden.')) return;
    act(async () => {
      await api.patch(`/admin/users/${report.listing.seller}/ban`, { isBanned: true });
      await api.del(`/listings/${report.listing._id}`);
      await api.patch(`/admin/reports/${report._id}`, { status: 'resolved' });
    }, 'Seller banned, ad removed, report resolved');
  };

  return (
    <>
      <div className="tabs">
        {['open', 'resolved', 'dismissed'].map((t) => (
          <button key={t} className={t === status ? '' : 'secondary'} onClick={() => setStatus(t)}>
            {t}
          </button>
        ))}
      </div>
      {message && <p className="muted">{message}</p>}
      {!reports && <p className="muted">Loading...</p>}
      {reports?.length === 0 && <p className="muted">No {status} reports.</p>}

      {reports?.map((r) => (
        <div className="report" key={r._id}>
          <p>
            <strong>{r.reason}</strong> · reported by {r.reporter?.name || 'deleted user'}
            {r.reporter?.email ? ` (${r.reporter.email})` : ''} · {new Date(r.createdAt).toLocaleString()}
          </p>
          {r.note && <p>“{r.note}”</p>}
          <p>
            Ad: {r.listing ? <Link to={`/listings/${r.listing._id}`}>{r.listing.title}</Link> : <span className="muted">no longer in the database</span>}
            {r.listing && <span className="muted"> ({r.listing.status})</span>}
          </p>
          <div className="actions">
            {status === 'open' && r.listing && r.listing.status !== 'removed' && (
              <>
                <button className="danger" onClick={() => removeAd(r)}>
                  Remove ad
                </button>
                <button className="danger" onClick={() => banSeller(r)}>
                  Ban seller
                </button>
              </>
            )}
            {status !== 'resolved' && (
              <button className="secondary" onClick={() => setReportStatus(r, 'resolved')}>
                Mark resolved
              </button>
            )}
            {status !== 'dismissed' && (
              <button className="secondary" onClick={() => setReportStatus(r, 'dismissed')}>
                Dismiss
              </button>
            )}
            {status !== 'open' && (
              <button className="secondary" onClick={() => setReportStatus(r, 'open')}>
                Reopen
              </button>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

function PendingAds() {
  const [items, setItems] = useState(null);
  const [message, setMessage] = useState('');
  const load = useCallback(() => api.get('/admin/listings/pending').then((d) => setItems(d.items)).catch((e) => { setItems([]); setMessage(e.message); }), []);
  useEffect(() => {
    load();
  }, [load]);

  const decide = async (ad, action) => {
    const note = action === 'reject' ? window.prompt('Reason shown to the seller (optional)') : undefined;
    if (action === 'reject' && note === null) return;
    try {
      await api.patch(`/admin/listings/${ad._id}/review`, { action, note: note || undefined });
      setMessage(action === 'approve' ? 'Ad approved' : 'Ad rejected');
      load();
    } catch (e) {
      setMessage(e.message);
    }
  };

  if (!items) return <p className="muted">Loading...</p>;
  return (
    <>
      <p className="muted">Ads that contain risky words wait here before they appear on the site.</p>
      {message && <p className="notice">{message}</p>}
      {items.length === 0 && <p className="muted">Nothing is waiting for review.</p>}
      {items.map((ad) => (
        <div className="report" key={ad._id}>
          <p>
            <strong>{ad.title}</strong> · {formatPrice(ad.price)} · {ad.category}
            <br />
            <small className="muted">
              by {ad.seller?.name} ({ad.seller?.email || 'no email'}) · {new Date(ad.createdAt).toLocaleString()}
            </small>
          </p>
          <p className="description">{ad.description || '-'}</p>
          <div className="actions">
            <button onClick={() => decide(ad, 'approve')}>Approve</button>
            <button className="danger" onClick={() => decide(ad, 'reject')}>
              Reject
            </button>
          </div>
        </div>
      ))}
    </>
  );
}

function Users() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState(null);
  const [message, setMessage] = useState('');
  const load = useCallback(
    (search = '') => api.get(`/admin/users?q=${encodeURIComponent(search)}`).then((d) => setItems(d.items)).catch((e) => { setItems([]); setMessage(e.message); }),
    []
  );
  useEffect(() => {
    load();
  }, [load]);

  const toggleBan = async (u) => {
    if (!u.isBanned && !window.confirm(`Ban ${u.name}? Their ads will be hidden.`)) return;
    try {
      await api.patch(`/admin/users/${u._id}/ban`, { isBanned: !u.isBanned });
      load(q);
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
          load(q);
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" />
        <button type="submit">Search</button>
      </form>
      {message && <p className="notice">{message}</p>}
      {!items && <p className="muted">Loading...</p>}
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Joined</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items?.map((u) => (
            <tr key={u._id}>
              <td>
                <Link to={`/u/${u._id}`}>{u.name}</Link> {u.role === 'admin' && <span className="badge">admin</span>} {u.isBanned && <span className="badge banned">banned</span>}
              </td>
              <td>{u.email || '-'}</td>
              <td>{new Date(u.createdAt).toLocaleDateString()}</td>
              <td>
                {u.role !== 'admin' && (
                  <button className={u.isBanned ? 'secondary small' : 'danger small'} onClick={() => toggleBan(u)}>
                    {u.isBanned ? 'Unban' : 'Ban'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default function Admin() {
  const [tab, setTab] = useState('overview');
  return (
    <>
      <h1>Admin</h1>
      <div className="tabs wrap">
        {TABS.map((name) => (
          <button key={name} className={tab === name ? '' : 'secondary'} onClick={() => setTab(name)}>
            {name}
          </button>
        ))}
      </div>
      {tab === 'overview' && <Overview />}
      {tab === 'reports' && <Reports />}
      {tab === 'pending ads' && <PendingAds />}
      {tab === 'users' && <Users />}
    </>
  );
}
