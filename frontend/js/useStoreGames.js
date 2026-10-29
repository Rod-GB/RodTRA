/*
 * Hook: useStoreGames
 * Folder: frontend/js
 * File: useStoreGames.js
 * Purpose: Reads Epic or itch.io games, removes expired offers and invalid
 *   itch.io genres, and prepares current price labels.
 */

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
    genres: (Array.isArray(game.genres) ? game.genres : [])
      .filter(genre => typeof genre === 'string' && genre.trim() && genre.length <= 80 && !/[\u0000-\u001f]/.test(genre))
      .map(genre => genre.trim()),
    price: game.price && { ...game.price, stale: !!game.price.stale || clock / 1000 - game.price.checkedAt >= 1800 || game.price.endsAt > 0 && game.price.endsAt * 1000 <= clock },
  })).filter(game => platform !== 'itch' || game.genres.length > 0);
  const genres = [...new Set(games.flatMap(game => game.genres || []))].sort((a, b) => a.localeCompare(b));
  return { ...remote, games, genres };
}
