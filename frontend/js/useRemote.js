import { useEffect, useState } from 'react';

// Public data only is shared on the server. Requests are cancelled on page exit.
export function useRemote(url, { body, interval = 0, enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const payload = body === undefined ? undefined : JSON.stringify(body);
  useEffect(() => {
    if (!enabled) return;
    let stopped = false, controller;
    setData(null); setLoading(true); setError('');
    const update = async () => {
      controller?.abort(); controller = new AbortController();
      try {
        const response = await fetch(url, { signal: controller.signal, cache: 'no-store', ...(payload === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload }) });
        const value = await response.json();
        if (!response.ok || value.error) throw new Error(value.error || 'Game information is temporarily unavailable.');
        if (!stopped) { setData(value); setError(''); }
      } catch (failure) { if (!stopped && failure.name !== 'AbortError') setError(failure.message); }
      finally { if (!stopped) setLoading(false); }
    };
    update();
    const timer = interval ? setInterval(() => { if (!document.hidden) update(); }, interval) : null;
    return () => { stopped = true; controller?.abort(); clearInterval(timer); };
  }, [url, payload, interval, enabled]);
  return { data, error, loading };
}
