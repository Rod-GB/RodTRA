import React, { useEffect, useState } from 'react';
import { useGames } from '../useGames';
import { number, steamImage } from '../format';
import GameToolbar from './GameToolbar';
import Rating from './Rating';
import Icon from './Icon';

export default function AllGamesView({ route, genres, onNavigate, onOpen }) {
  const { data, loading, error } = useGames(route.search, route.genre, route.sort);
  const [limit, setLimit] = useState(20);
  useEffect(() => setLimit(20), [route.search, route.genre, route.sort]);
  const reset = () => onNavigate({ search: '', genre: '', sort: 'players' }, true);
  return <section className="library-view" aria-labelledby="library-title">
    <div className="page-heading"><div><p className="eyebrow">The game library</p><h1 id="library-title">All <span>games.</span></h1><p>Search and browse the games in our Steam collection.</p></div><span className="library-total">{data.trackedGames || 0}<span>games tracked</span></span></div>
    <div className="library-toolbar"><GameToolbar search={route.search} genre={route.genre} sort={route.sort} genres={genres} onSearch={search => onNavigate({ search }, true)} onGenre={genre => onNavigate({ genre })} onSort={sort => onNavigate({ sort }, true)} onReset={reset}/></div>
    <div className="lineup-meta"><p role="status" aria-live="polite">{loading ? 'Finding games…' : `${data.games.length} matching games`}</p><span>From Steam’s top 100</span></div>
    {error && <p className="notice" role="status">{error}</p>}
    <div className="library-list">{data.games.slice(0, limit).map(game => <article className="library-row" key={game.appID}>
      <button className="library-art" onClick={() => onOpen(game.appID)} aria-label={`Open ${game.title}`}>{steamImage(game.image) && <img src={steamImage(game.image)} alt="" loading="lazy"/>}</button>
      <div className="library-info"><span className="library-id">STEAM / {game.appID}</span><h2><button onClick={() => onOpen(game.appID)}>{game.title}</button></h2><div className="library-tags">{game.genres.slice(0, 3).map(genre => <span key={genre}>{genre}</span>)}</div></div>
      <div className="library-metrics"><div><strong>{number(game.currentPlayers)}</strong><span>players now</span></div><div><strong>{number(game.peakToday)}</strong><span>peak today</span></div></div>
      <div className="library-actions"><Rating game={game}/><button className="secondary-button" onClick={() => onOpen(game.appID)}>Details <Icon name="arrow"/></button></div>
    </article>)}</div>
    {loading && !data.games.length && <div className="list-skeleton" role="status"><span className="sr-only">Loading the game library…</span>{[0,1,2].map(index => <div key={index} className="skeleton-line" aria-hidden="true"/>)}</div>}
    {!loading && !data.games.length && <div className="empty-state"><Icon name="search"/><h3>No matching games</h3><p>Try a different title, Steam ID, or genre.</p>{(route.search || route.genre) && <button className="secondary-button" onClick={reset}>Reset filters</button>}</div>}
    {limit < data.games.length && <div className="browse-actions"><button className="secondary-button" onClick={() => setLimit(value => value + 20)}>Load more games</button></div>}
  </section>;
}
