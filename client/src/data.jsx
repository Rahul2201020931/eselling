import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { useAuth } from './auth.jsx';

const DataContext = createContext(null);

// Things many pages need: the lists for menus, which ads I saved, and the unread counters.
export function DataProvider({ children }) {
  const { user } = useAuth();
  const [meta, setMeta] = useState(null);
  const [favIds, setFavIds] = useState(() => new Set());
  const [unreadChats, setUnreadChats] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const userId = user?.id;
  const timer = useRef(null);

  useEffect(() => {
    api.get('/meta').then(setMeta).catch(() => {});
  }, []);

  const refreshCounts = useCallback(async () => {
    if (!userId || document.visibilityState === 'hidden') return;
    const [c, n] = await Promise.all([
      api.get('/chats/unread-count').catch(() => null),
      api.get('/notifications/unread-count').catch(() => null),
    ]);
    if (c) setUnreadChats(c.count);
    if (n) setUnreadNotifs(n.count);
  }, [userId]);

  useEffect(() => {
    clearInterval(timer.current);
    if (!userId) {
      setFavIds(new Set());
      setUnreadChats(0);
      setUnreadNotifs(0);
      return undefined;
    }
    api.get('/favorites/ids').then((d) => setFavIds(new Set(d.ids))).catch(() => {});
    refreshCounts();
    timer.current = setInterval(refreshCounts, 15000);
    return () => clearInterval(timer.current);
  }, [userId, refreshCounts]);

  // Add or remove a favorite; the heart changes at once and goes back if the server refuses.
  const toggleFavorite = useCallback(
    async (id) => {
      const had = favIds.has(id);
      setFavIds((prev) => {
        const next = new Set(prev);
        if (had) next.delete(id);
        else next.add(id);
        return next;
      });
      try {
        if (had) await api.del(`/favorites/${id}`);
        else await api.post(`/favorites/${id}`);
      } catch {
        setFavIds((prev) => {
          const next = new Set(prev);
          if (had) next.add(id);
          else next.delete(id);
          return next;
        });
      }
    },
    [favIds]
  );

  const value = { meta, favIds, toggleFavorite, unreadChats, unreadNotifs, refreshCounts, setUnreadNotifs };
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);
