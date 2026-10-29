import React from 'react';
import Icon from './Icon';
import { gameImage } from '../format';
import { routeURL } from '../navigation';

export default function GenreGrid({ games, genres, platform = 'steam', children }) {
  return <div className="genre-grid">{genres.map((genre, index) => {
    const matches = games.filter(game => game.genres.includes(genre));
    return <a className={`genre-tile genre-tone-${index % 4}`} key={genre} href={routeURL({ view: 'genres', genre, platform })}>
      <div className="genre-collage" aria-hidden="true">{matches.slice(0, 3).map(game => gameImage(game.image) && <img key={game.appID || game.id} src={gameImage(game.image)} alt="" loading="lazy"/>)}</div>
      <div className="genre-tile-content"><span className="genre-count">{matches.length} {matches.length === 1 ? 'game' : 'games'}</span><h2>{genre}</h2><span className="genre-tile-action">Explore genre <Icon name="arrow"/></span></div>
    </a>;
  })}{children}</div>;
}
