import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useData } from '../data.jsx';
import { useI18n } from '../i18n.jsx';
import { formatPrice, initials, timeAgo } from '../format.js';

function Inbox({ activeId }) {
  const { t } = useI18n();
  const { unreadChats } = useData();
  const [items, setItems] = useState(null);

  const load = useCallback(() => api.get('/chats').then((d) => setItems(d.items)).catch(() => setItems((x) => x ?? [])), []);
  // reload when the page opens, when another chat is picked, and when the unread count changes
  useEffect(() => {
    load();
  }, [load, activeId, unreadChats]);
  useEffect(() => {
    const timer = setInterval(() => document.visibilityState === 'visible' && load(), 10000);
    return () => clearInterval(timer);
  }, [load]);

  if (!items) return <p className="muted">{t('Loading...')}</p>;
  if (items.length === 0) return <p className="muted pad">{t('No chats yet.')}</p>;

  return (
    <ul className="inbox">
      {items.map((c) => (
        <li key={c.id}>
          <Link to={`/chats/${c.id}`} className={`inbox-row ${c.id === activeId ? 'on' : ''}`}>
            <span className="avatar">{initials(c.other.name)}</span>
            <span className="inbox-text">
              <strong>{c.other.name}</strong>
              <small className="muted">{c.listing?.title ?? 'Ad removed'}</small>
              <small className={c.unread ? 'unread-text' : 'muted'}>{c.lastMessage?.text ?? '...'}</small>
            </span>
            {c.unread > 0 && <span className="count">{c.unread}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Conversation({ id }) {
  const { t } = useI18n();
  const { meta, refreshCounts } = useData();
  const { user } = useAuth();
  const [info, setInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [offering, setOffering] = useState(false);
  const [offer, setOffer] = useState('');
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const lastAt = useRef(null);
  const polling = useRef(false);

  const addMessages = useCallback((incoming) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m._id));
      const fresh = incoming.filter((m) => !seen.has(m._id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
    lastAt.current = incoming[incoming.length - 1].createdAt;
  }, []);

  const fetchMessages = useCallback(async () => {
    if (polling.current) return;
    polling.current = true;
    try {
      const qs = lastAt.current ? `?after=${encodeURIComponent(lastAt.current)}` : '';
      const d = await api.get(`/chats/${id}/messages${qs}`);
      addMessages(d.items);
      if (d.items.length) refreshCounts();
    } catch {
      // a failed poll is simply tried again in a few seconds
    } finally {
      polling.current = false;
    }
  }, [id, addMessages, refreshCounts]);

  useEffect(() => {
    setInfo(null);
    setMessages([]);
    setError('');
    lastAt.current = null;
    api.get(`/chats/${id}`).then(setInfo).catch((e) => setError(e.message));
    fetchMessages().then(refreshCounts);
    const timer = setInterval(() => document.visibilityState === 'visible' && fetchMessages(), 3000);
    return () => clearInterval(timer);
  }, [id, fetchMessages, refreshCounts]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const send = async (body) => {
    setError('');
    try {
      const m = await api.post(`/chats/${id}/messages`, body);
      addMessages([m]);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (await send({ type: 'text', text })) setText('');
  };

  const submitOffer = async (e) => {
    e.preventDefault();
    if (offer === '') return;
    if (await send({ type: 'offer', offerAmount: offer })) {
      setOffer('');
      setOffering(false);
    }
  };

  const toggleBlock = async () => {
    if (!info.blocked && !window.confirm(`Block ${info.other.name}? You will not be able to message each other.`)) return;
    try {
      if (info.blocked) await api.del(`/users/${info.other._id}/block`);
      else await api.post(`/users/${info.other._id}/block`);
      setInfo({ ...info, blocked: !info.blocked });
    } catch (e) {
      setError(e.message);
    }
  };

  if (error && !info) return <p className="error pad">{error}</p>;
  if (!info) return <p className="muted pad">{t('Loading...')}</p>;

  const locked = info.blocked || info.blockedByThem || !info.listing || !['active', 'sold'].includes(info.listing.status);

  return (
    <div className="conversation">
      <div className="conv-head">
        <Link to="/chats" className="back">
          ←
        </Link>
        <span className="avatar">{initials(info.other.name)}</span>
        <div className="conv-title">
          <Link to={`/u/${info.other._id}`}>
            <strong>{info.other.name}</strong>
          </Link>
          {info.listing && (
            <Link to={`/listings/${info.listing._id}`} className="muted small-text">
              {info.listing.title} · {formatPrice(info.listing.price)}
            </Link>
          )}
        </div>
        <button className="link" onClick={toggleBlock}>
          {info.blocked ? t('Unblock') : t('Block')}
        </button>
      </div>

      <p className="safety slim">
        Keep chatting here. Never pay in advance, and be careful if someone asks you to move to another app. <Link to="/info/safety">{t('Safety tips')}</Link>
      </p>

      <div className="messages">
        {messages.length === 0 && <p className="muted center">Say hello to start the chat.</p>}
        {messages.map((m) => {
          const mine = m.sender === user.id;
          return (
            <div key={m._id} className={`bubble-row ${mine ? 'mine' : ''}`}>
              <div className={`bubble ${m.type === 'offer' ? 'offer' : ''}`}>
                {m.type === 'offer' && (
                  <strong>
                    {t('Make an offer')}: {formatPrice(m.offerAmount)}
                  </strong>
                )}
                {m.text && <span>{m.text}</span>}
                <small className="muted">{timeAgo(m.createdAt)}</small>
                {m.flagged && (
                  <small className="warn">Careful: this message mentions payment or a common scam phrase. Never pay before you see the item.</small>
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {error && <p className="error pad">{error}</p>}

      {locked ? (
        <p className="muted pad">
          {info.blocked ? 'You blocked this person. Unblock to chat again.' : info.blockedByThem ? 'You cannot message this person.' : 'This ad is no longer available.'}
        </p>
      ) : (
        <>
          {messages.length === 0 && (
            <div className="quick">
              {meta?.quickReplies.map((q) => (
                <button key={q} type="button" className="chip" onClick={() => send({ type: 'text', text: q })}>
                  {t(q)}
                </button>
              ))}
            </div>
          )}
          {offering ? (
            <form className="composer" onSubmit={submitOffer}>
              <input type="number" min="0" value={offer} onChange={(e) => setOffer(e.target.value)} placeholder={t('Offer (Rs.)')} autoFocus required />
              <button type="submit">{t('Send')}</button>
              <button type="button" className="secondary" onClick={() => setOffering(false)}>
                ✕
              </button>
            </form>
          ) : (
            <form className="composer" onSubmit={submit}>
              {info.role === 'buyer' && (
                <button type="button" className="secondary" onClick={() => setOffering(true)}>
                  {t('Make an offer')}
                </button>
              )}
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t('Type a message...')} maxLength={1000} />
              <button type="submit">{t('Send')}</button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

export default function Chats() {
  const { id } = useParams();
  const { t } = useI18n();

  return (
    <div className={`chat-layout ${id ? 'has-active' : ''}`}>
      <aside className="chat-list">
        <h1>{t('Messages')}</h1>
        <Inbox activeId={id} />
      </aside>
      <section className="chat-main">
        {id ? (
          <Conversation key={id} id={id} />
        ) : (
          <p className="muted pad desktop-only">Pick a chat on the left, or start one from an ad.</p>
        )}
      </section>
    </div>
  );
}
