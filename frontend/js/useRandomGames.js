import { useEffect, useState } from 'react';

// Hint: Fisher-Yates shuffles IDs once; count updates keep the same picks.
export function randomIDs(ids, count = 8, random = Math.random) {
  const shuffled = [...ids];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  return shuffled.slice(0, count);
}

export function useRandomGames(games) {
  const [ids, setIDs] = useState([]);
  useEffect(() => {
    setIDs(previous => {
      return keepRandomIDs(previous, games.map(game => game.appID));
    });
  }, [games]);
  const byID = new Map(games.map(game => [game.appID, game]));
  return ids.map(id => byID.get(id)).filter(Boolean);
}

export function keepRandomIDs(previous, availableIDs) {
  const available = new Set(availableIDs);
  const kept = [...new Set(previous)].filter(id => available.has(id)).slice(0, 8);
  const needed = Math.min(8, available.size) - kept.length;
  if (!needed && kept.length === previous.length) return previous;
  const remaining = [...available].filter(id => !kept.includes(id));
  return [...kept, ...randomIDs(remaining, needed)];
}
