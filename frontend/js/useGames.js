import { useEffect, useState } from 'react';

// C++ handles searching, filtering and sorting through this request.
export function useGames(search, genre, sort) {
  const [data, setData] = useState({ games: [], genres: [], trackedGames: 0, refreshing: true });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    setData(previous => ({ ...previous, games: [] }));
    let stopped = false;
    let controller;
    let interval;
    async function fetchGames() {
      controller?.abort();
      controller = new AbortController();
      try {
        const query = new URLSearchParams({ q: search.trim(), genre, sort });
        const response = await fetch(`/api/games?${query}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Could not load the games.');
        const result = await response.json();
        if (!stopped) { setData(result); setError(''); setLoading(false); }
      } catch (failure) {
        if (!stopped && failure.name !== 'AbortError') {
          setError('Website temporarily unavailable. Reconnecting…');
          setLoading(false);
        }
      }
    }
    const visibleUpdate = () => { if (!document.hidden) fetchGames(); };
    const delay = setTimeout(() => { fetchGames(); interval = setInterval(visibleUpdate, 10000); }, 200);
    document.addEventListener('visibilitychange', visibleUpdate);
    return () => { stopped = true; clearTimeout(delay); clearInterval(interval); controller?.abort(); document.removeEventListener('visibilitychange', visibleUpdate); };
  }, [search, genre, sort]);
  return { data, error, loading };
}
