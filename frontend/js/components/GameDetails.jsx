import React, { useEffect, useRef, useState } from 'react';
import PlayerChart from './PlayerChart';
import Rating from './Rating';
import { number, date, timestamp, plainText, steamImage } from '../format';

function ReviewCard({ review }) {
  const profile = `https://steamcommunity.com/profiles/${encodeURIComponent(review.steamID)}`;
  const link = `https://steamcommunity.com/profiles/${encodeURIComponent(review.steamID)}/recommended/${review.appID}/`;
  return <article className="review-card">
    <div className="review-top"><span className={`recommendation ${review.recommended ? 'positive' : 'negative'}`}>
      <span aria-hidden="true">{review.recommended ? '↑' : '↓'}</span> {review.recommended ? 'Recommended' : 'Not recommended'}</span><time dateTime={new Date(review.time * 1000).toISOString()}>{date(review.time)}</time></div>
    <p className="review-text">{review.text}</p>
    <div className="review-bottom"><a href={profile} target="_blank" rel="noreferrer">Steam player · {review.steamID.slice(-6)}</a>
      <span>{(review.minutesPlayed / 60).toFixed(1)} hours at review</span><a href={link} target="_blank" rel="noreferrer">View on Steam ↗</a></div>
    {!!review.helpfulVotes && <p className="helpful">{number(review.helpfulVotes)} found this helpful</p>}
  </article>;
}

// Hint: a game detail request uses C++ binary search.
export default function GameDetails({ appID, onClose }) {
  const dialog = useRef(null);
  const [game, setGame] = useState(null);
  const [error, setError] = useState('');
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
        if (!stopped) { setGame(result.game); setError(''); }
      } catch (failure) { if (!stopped && failure.name !== 'AbortError') setError(failure.message); }
    }
    update();
    const interval = setInterval(update, 15000);
    return () => { stopped = true; controller?.abort(); clearInterval(interval); };
  }, [appID]);
  return <dialog ref={dialog} className="game-dialog" aria-labelledby="detail-title" onClose={onClose} onClick={event => {
    if (event.target === dialog.current) {
      const bounds = dialog.current.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.current.close();
    }
  }}>
    <button className="dialog-close" onClick={() => dialog.current.close()} aria-label="Close game details">×</button>
    {error && <p className="notice" role="alert">{error}</p>}
    {!game ? <h2 id="detail-title">{error ? 'Game unavailable' : 'Loading game…'}</h2> : <>
      <header className="detail-header">{steamImage(game.image) && <img src={steamImage(game.image)} alt=""/>}<div><span className="eyebrow">STEAM GAME</span><h2 id="detail-title">{game.title}</h2><p className="muted">{game.genres.join(' · ')}</p>
        <a className="store-link" href={`https://store.steampowered.com/app/${game.appID}/`} target="_blank" rel="noreferrer">Steam store ↗</a></div></header>
      <p className="game-description">{plainText(game.description)}</p>
      <div className="detail-stats"><div><span>Players now</span><strong>{number(game.currentPlayers)}</strong></div><div><span>Peak today</span><strong>{number(game.peakToday)}</strong></div><div><span>Overall rating</span><Rating game={game}/></div></div>
      <p className="small muted">Steam player data: {timestamp(game.playersUpdatedAt)} · Released: {game.releaseDate || 'Not listed'}</p>
      <PlayerChart key={game.appID} game={game} large/>
      <section className="reviews-section"><div className="reviews-heading"><div><h3>Player reviews</h3><p className="small muted">Recent English reviews · Overall rating: all languages.</p></div><span className="review-total">{number(game.totalReviews)} total</span></div>
        <p className="small muted">Updated: {timestamp(game.reviewsUpdatedAt)}</p>
        {game.reviews.length ? <div className="review-list">{game.reviews.map(review => <ReviewCard key={review.id} review={{ ...review, appID: game.appID }}/>)}</div> : <p className="empty-reviews">{game.reviewsUpdatedAt ? 'No recent English reviews available.' : 'Reviews are temporarily unavailable.'}</p>}
      </section>
    </>}
  </dialog>;
}
