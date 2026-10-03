import React from 'react';
import { number, steamImage } from '../format';

export default function GenreGrid({ games, genres, onBrowse, onOpen }) {
  return <div className="genre-grid">{genres.map(genre => {
    const matches = games.filter(game => game.genres.includes(genre));
    return <article className="genre-card" key={genre}><div className="genre-card-top"><span>{matches.length} {matches.length === 1 ? 'game' : 'games'}</span><span aria-hidden="true">↗</span></div>
      <h3>{genre}</h3><div className="genre-games">{matches.slice(0, 3).map(game => <button key={game.appID} className="genre-game" onClick={() => onOpen(game.appID)}>
        {steamImage(game.image) && <img src={steamImage(game.image)} alt=""/>}<span>{game.title}</span><span>{number(game.currentPlayers)}</span>
      </button>)}</div><button className="text-link genre-explore" onClick={() => onBrowse(genre)}>View games <span aria-hidden="true">→</span></button>
    </article>;
  })}</div>;
}
