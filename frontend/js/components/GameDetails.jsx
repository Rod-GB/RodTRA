import React, { useEffect, useRef, useState } from 'react';
import PlayerChart from './PlayerChart';
import Rating from './Rating';
import ReviewsSection from './ReviewsSection';
import PatchNotes from './PatchNotes';
import Price from './Price';
import ScreenshotGallery from './ScreenshotGallery';
import GameMetadata from './GameMetadata';
import { number, timestamp, plainText, steamImage } from '../format';
import { useSteamPages } from '../useSteamPages';

// a game detail request uses C++ binary search.
export default function GameDetails({ appID, onClose, section = 'overview', onSection }) {
  const dialog = useRef(null);
  const [game, setGame] = useState(null);
  const [error, setError] = useState('');
  const pages = useSteamPages('patches', appID);
  useEffect(() => {
    if (!dialog.current.open) dialog.current.showModal();
    let stopped = false;
    let controller;
    async function update() {
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch(`/api/game?id=${appID}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load game details.');
        if (!stopped) { setGame({ ...result.game, historySaveSeconds: result.historySaveSeconds || 900 }); setError(''); }
      } catch (failure) { if (!stopped && failure.name !== 'AbortError') setError(failure.message); }
    }
    update();
    const interval = setInterval(update, 10000);
    return () => { stopped = true; controller?.abort(); clearInterval(interval); };
  }, [appID]);
  return <dialog ref={dialog} className="game-dialog" aria-labelledby="detail-title" onClose={event => { if (event.target === event.currentTarget) onClose(); }} onClick={event => {
    if (event.target === dialog.current) {
      const bounds = dialog.current.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.current.close();
    }
  }}>
    <button className="dialog-close" onClick={() => dialog.current.close()} aria-label="Close game details">×</button>
    {error && <p className="notice" role="alert">{error}</p>}
    {!game ? <h2 id="detail-title">{error ? 'Game unavailable' : 'Loading game…'}</h2> : <>
      <header className="detail-header">{steamImage(game.image) && <img src={steamImage(game.image)} alt=""/>}<div><span className="eyebrow">STEAM GAME</span><h2 id="detail-title">{game.title}</h2><p className="muted">{game.genres.join(' · ')}</p>
        <a className="store-link" href={`https://store.steampowered.com/app/${game.appID}/`} target="_blank" rel="noreferrer">Steam store</a></div></header>
      <nav className="detail-nav" aria-label="Game sections">{[['overview', 'Overview'], ['reviews', 'Reviews'], ['updates', 'Updates']].map(([tab, label]) => <button key={tab} aria-pressed={section === tab} onClick={() => onSection(tab)}>{label}</button>)}</nav>
      {section === 'overview' ? <><p className="game-description">{plainText(game.description)}</p>
      <Price price={game.price} detailed/>
      <ScreenshotGallery screenshots={game.screenshots} title={game.title}/>
      <div className="detail-stats"><div><span>Players now</span><strong>{number(game.currentPlayers)}</strong></div><div><span>Peak today</span><strong>{number(game.peakToday)}</strong></div><div><span>Total reviews</span><strong>{game.reviewsUpdatedAt ? number(game.totalReviews) : '—'}</strong></div><div><span>Overall rating</span><Rating game={game}/></div></div>
      <p className="small muted">Steam player data: {timestamp(game.playersUpdatedAt)} · Released: {game.releaseDate || 'Not listed'}</p>
      <PlayerChart key={game.appID} game={game} large/>
      <GameMetadata game={game} pages={pages}/>
      </> : section === 'reviews' ? <ReviewsSection game={game}/> : <PatchNotes pages={pages}/>}
    </>}
  </dialog>;
}
