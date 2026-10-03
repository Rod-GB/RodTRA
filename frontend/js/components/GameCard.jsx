import React from 'react';
import Rating from './Rating';
import { number, steamImage } from '../format';

// Hint: C++ supplies the ordered records; each card opens live game details.
export default function GameCard({ game, rank, onOpen }) {
  return <article className="game-card">
    <button className="card-image-button" onClick={() => onOpen(game.appID)} aria-label={`View ${game.title} stats`}>
      {steamImage(game.image) && <img src={steamImage(game.image)} alt="" loading="lazy"/>}
      <span className="rank">{String(rank).padStart(2, '0')}</span><span className="image-arrow" aria-hidden="true">↗</span>
    </button>
    <div className="card-content"><p className="card-genre">{game.genres.slice(0, 3).join(' · ') || 'Genre unavailable'}</p>
      <h3><button onClick={() => onOpen(game.appID)}>{game.title}</button></h3>
      <div className="card-metric"><span className="player-number">{number(game.currentPlayers)}<small>players now</small></span><div className="card-rating"><Rating game={game}/></div></div>
      <div className="card-footer"><span>Peak today <strong>{number(game.peakToday)}</strong></span><button className="text-link" onClick={() => onOpen(game.appID)}>View stats <span aria-hidden="true">↗</span></button></div>
    </div>
  </article>;
}
