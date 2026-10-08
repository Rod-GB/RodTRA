import { useCallback, useEffect, useRef, useState } from 'react';

// Refresh the head without removing older pages or resetting the reader.
export function useSteamPages(kind, appID, sort = 'recent') {
  const [page, setPage] = useState({ items: [], hasMore: false, updatedAt: 0, message: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(null), generation = useRef(0), busy = useRef(false);
  const items = useRef([]), next = useRef('');
  const load = useCallback(async (reset = false, head = false) => {
    if (busy.current && !reset) return;
    if (reset) {
      generation.current++; request.current?.abort(); items.current = []; next.current = '';
      setPage({ items: [], hasMore: false, updatedAt: 0, message: '' });
    }
    const version = generation.current;
    busy.current = true; setLoading(true); setError('');
    const controller = new AbortController();
    request.current = controller;
    try {
      const query = new URLSearchParams({ id: appID, sort });
      if (!head && next.current) query.set(kind === 'reviews' ? 'cursor' : 'before', next.current);
      const response = await fetch(`/api/${kind}?${query}`, { signal: controller.signal });
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error || 'Steam data unavailable. Try again.');
      if (version !== generation.current) return;
      const incoming = kind === 'reviews' ? result.reviews : result.posts;
      if (!Array.isArray(incoming)) throw new Error('Steam returned an unexpected page.');
      const incomingByID = new Map(incoming.map(item => [item.id, item]));
      const existingIDs = new Set(items.current.map(item => item.id));
      const added = incoming.filter(item => !existingIDs.has(item.id));
      const previous = items.current.map(item => incomingByID.get(item.id) || item);
      items.current = head ? [...added, ...previous] : [...previous, ...added];
      const cursor = String(kind === 'reviews' ? result.cursor || '' : result.before || '');
      const advancing = !!cursor && cursor !== next.current;
      if (!head || !next.current) next.current = cursor;
      setPage(previousPage => ({
        items: items.current,
        hasMore: head && previousPage.items.length ? previousPage.hasMore || !!result.hasMore : !!result.hasMore && !!incoming.length && advancing,
        updatedAt: result.updatedAt, message: result.message || '',
      }));
    } catch (failure) {
      if (version === generation.current && failure.name !== 'AbortError') setError(failure.message);
    } finally {
      if (version === generation.current) { busy.current = false; setLoading(false); }
    }
  }, [kind, appID, sort]);
  useEffect(() => {
    load(true);
    const refreshIfVisible = () => { if (!document.hidden) load(false, true); };
    const interval = setInterval(refreshIfVisible, kind === 'reviews' ? 600000 : 300000);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      generation.current++; request.current?.abort(); busy.current = false; clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [load, kind]);
  return { ...page, loading, error, loadMore: () => load(), refresh: () => load(false, true) };
}
