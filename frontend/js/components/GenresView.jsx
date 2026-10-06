import React, { useEffect, useState } from 'react';
import GenreGrid from './GenreGrid';
import GameToolbar from './GameToolbar';
import Rating from './Rating';
import Icon from './Icon';
import { useGames } from '../useGames';
import { number, steamImage } from '../format';

function GenreExplorer({ route, genres, onNavigate, onOpen }) {
  const result = useGames(route.search, route.genre, route.sort);
  const [limit, setLimit] = useState(20);
  useEffect(() => setLimit(20), [route.search, route.genre, route.sort]);
  const reset = () => onNavigate({ search: '', sort: 'players' }, true);
  return <>
    <div className="genre-filter-panel"><GameToolbar search={route.search} genre={route.genre} sort={route.sort} genres={genres} onSearch={search => onNavigate({ search }, true)} onGenre={genre => onNavigate({ genre, browse: !genre, search: '' })} onSort={sort => onNavigate({ sort }, true)} onReset={reset}/></div>
    <div className="lineup-meta"><p role="status" aria-live="polite">{result.loading ? 'Finding games…' : `${result.data.games.length} games found`}</p><span>{route.sort === 'rating' ? 'Highest rated first' : route.sort === 'title' ? 'A–Z' : 'Most players first'}</span></div>
    {result.error && <p className="notice" role="status">{result.error}</p>}
    <div className="genre-results">{result.data.games.slice(0, limit).map(game => <article className="genre-result" key={game.appID}>
      <button className="result-art" onClick={() => onOpen(game.appID)} aria-label={`View ${game.title}`}>{steamImage(game.image) && <img src={steamImage(game.image)} alt="" loading="lazy"/>}</button>
      <div className="result-description"><h2><button onClick={() => onOpen(game.appID)}>{game.title}</button></h2><p>{game.genres.join(' · ') || 'Genre unavailable'}</p></div>
      <div className="result-players"><strong>{number(game.currentPlayers)}</strong><span>players now</span></div><div className="result-rating"><Rating game={game}/></div>
      <button className="icon-button result-open" onClick={() => onOpen(game.appID)} aria-label={`Open ${game.title} details`}><Icon name="arrow"/></button>
    </article>)}</div>
    {result.loading && !result.data.games.length && <div className="list-skeleton" role="status"><span className="sr-only">Loading games…</span>{[0, 1, 2, 3].map(index => <div key={index} className="skeleton-line" aria-hidden="true"/>)}</div>}
    {!result.loading && !result.data.games.length && <div className="empty-state"><Icon name="search"/><h3>{result.error ? 'Games are temporarily unavailable' : 'No matching games'}</h3><p>{result.error ? 'We’re reconnecting to the collection.' : 'Try another title, Steam ID, or genre.'}</p>{route.search && <button className="secondary-button" onClick={reset}>Clear search</button>}</div>}
    {limit < result.data.games.length && <div className="browse-actions"><button className="secondary-button" onClick={() => setLimit(value => value + 20)}>Load more games</button></div>}
  </>;
}

export default function GenresView({ data, route, onNavigate, onOpen }) {
  const browsing = !!route.genre || route.browse || !!route.search;
  return <section className="genres-view" aria-labelledby="genres-title">
    <div className="page-heading"><div><p className="eyebrow">Explore by genre</p><h1 id="genres-title">{browsing ? route.genre || 'All games' : <>Play your <span>way.</span></>}</h1><p>{browsing ? 'Find a game that fits your mood.' : 'Choose a world to get lost in. Every genre is a different adventure.'}</p></div>
      <a className="secondary-button" href={browsing ? '#/genres' : '#/genres?browse=all'}>{browsing ? '← All genres' : 'Browse all games'}{!browsing && <Icon name="arrow"/>}</a>
    </div>
    {browsing ? <GenreExplorer route={route} genres={data.genres} onNavigate={onNavigate} onOpen={onOpen}/> : <>
      <div className="genre-intro"><span>{data.genres.length} genres</span><p>From the games we collect in Steam’s top 100.</p></div>
      <GenreGrid games={data.games} genres={data.genres}/>
      {!data.genres.length && <div className="empty-state"><Icon name="genres"/><h3>{data.refreshing ? 'Gathering genres' : 'Genres are not available yet'}</h3><p>Categories appear as Steam game details arrive.</p></div>}
    </>}
  </section>;
}