import { useEffect, useState } from 'react';
import { useRemote } from './useRemote';

// Public collections are cached once by C++; visitor choices stay in React memory.
export function useStoreGames(platform) {
  const remote = useRemote(`/api/${platform}`, { enabled: platform !== 'steam', interval: 30000 });
  const [clock, setClock] = useState(Date.now);
  useEffect(() => {
    const tick = () => setClock(Date.now());
    const timer = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, []);
  const games = (remote.data?.games || []).filter(game => game.source === platform && (platform !== 'epic' || game.endsAt * 1000 > clock)).map(game => ({ ...game,
    price: game.price && { ...game.price, stale: !!game.price.stale || clock / 1000 - game.price.checkedAt >= 1800 || game.price.endsAt > 0 && game.price.endsAt * 1000 <= clock },
  }));
  const genres = [...new Set(games.flatMap(game => game.genres || []))].sort((a, b) => a.localeCompare(b));
  return { ...remote, games, genres };
}
