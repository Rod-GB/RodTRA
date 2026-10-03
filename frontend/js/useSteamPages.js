import { useCallback, useEffect, useRef, useState } from 'react';

// Hint: keep Steam's next-page cursor and ignore cancelled requests.
export function useSteamPages(kind, appID, sort = 'recent') {
  const [page, setPage] = useState({ items: [], hasMore: false, updatedAt: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(null);
  const generation = useRef(0);
  const busy = useRef(false);
  const items = useRef([]);
  const next = useRef('');
  const load = useCallback(async (reset = false) => {
    if (busy.current && !reset) return;
    if (reset) { generation.current++; request.current?.abort(); items.current = []; next.current = ''; setPage({ items: [], hasMore: false, updatedAt: 0 }); }
    const version = generation.current;
    busy.current = true;
    setLoading(true); setError('');
    const controller = new AbortController();
    request.current = controller;
    try {
      const query = new URLSearchParams({ id: appID, sort });
      if (next.current) query.set(kind === 'reviews' ? 'cursor' : 'before', next.current);
      const response = await fetch(`/api/${kind}?${query}`, { signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Steam data unavailable. Try again.');
      if (version !== generation.current) return;
      const incoming = kind === 'reviews' ? result.reviews : result.posts;
      const seen = new Set(items.current.map(item => item.id));
      const added = incoming.filter(item => !seen.has(item.id) && seen.add(item.id));
      items.current = [...items.current, ...added];
      const cursor = String(kind === 'reviews' ? result.cursor || '' : result.before || '');
      const hasMore = result.hasMore && !!added.length && !!cursor && cursor !== next.current;
      next.current = cursor;
      setPage({ items: items.current, hasMore, updatedAt: result.updatedAt });
    } catch (failure) { if (version === generation.current && failure.name !== 'AbortError') setError(failure.message); }
    finally { if (version === generation.current) { busy.current = false; setLoading(false); } }
  }, [kind, appID, sort]);
  useEffect(() => {
    load(true);
    return () => { generation.current++; request.current?.abort(); busy.current = false; };
  }, [load]);
  return { ...page, loading, error, loadMore: () => load(), refresh: () => load(true) };
}
