import React from 'react';
import Rating from './Rating';
import { number, steamImage } from '../format';

export default function FeaturedGame({ game, onOpen }) {
  if (!game) return <div className="featured-loading">Loading Steam games…</div>;
  return <div className="hero-art"><button className="featured-game" onClick={() => onOpen(game.appID)} aria-label={`View ${game.title} stats`}>
    {steamImage(game.image) && <img src={steamImage(game.image)} alt="" fetchPriority="high"/>}
    <span className="featured-top"><span>MOST PLAYED</span><span aria-hidden="true">↗</span></span>
    <span className="featured-bottom"><span className="featured-name">{game.title}</span><span className="featured-players">{number(game.currentPlayers)}<small>players now</small></span></span>
  </button><div className="art-caption"><span className="crosshair" aria-hidden="true">+</span><span>{game.genres.slice(0, 2).join(' · ')}</span><Rating game={game}/></div></div>;
}
