import React, { useEffect, useState } from 'react';
import { useGames } from '../useGames';
import { number, steamImage } from '../format';
import GameToolbar from './GameToolbar';
import Rating from './Rating';
import Icon from './Icon';
import Price from './Price';
import StoreGames from './StoreGames';
import StoreCollectionNote from './StoreCollectionNote';
import { useStoreGames } from '../useStoreGames';
import { platformNames } from './PlatformSelect';

export default function AllGamesView({ route, genres, onNavigate, onOpen }) {
  const platform = route.platform || 'steam', steam = platform === 'steam';
  const library = useGames(route.search, route.genre, route.sort, steam);
  const store = useStoreGames(platform);
  const { data } = library;
  const loading = steam ? library.loading : store.loading;
  const error = steam ? library.error : store.error;
  const choices = steam ? genres : store.genres;
  let visible = steam ? data.games : store.games.filter(game =>
    game.title.toLowerCase().includes(route.search.toLowerCase()) && (!route.genre || game.genres?.includes(route.genre)));
  if (!steam && route.sort === 'title') visible = [...visible].sort((a, b) => a.title.localeCompare(b.title));
  const [limit, setLimit] = useState(20);
  useEffect(() => setLimit(20), [route.search, route.genre, route.sort, platform]);
  const reset = () => onNavigate({ search: '', genre: '', sort: 'players' }, true);
  return <section className="library-view" aria-labelledby="library-title">
    <div className="page-heading"><div><p className="eyebrow">The game library</p><h1 id="library-title">All <span>games.</span></h1><p>{steam ? "Browse Steam’s existing top 100." : platform === 'epic' ? 'Currently claimable free-to-keep games in the Philippines.' : 'Discover recent games from itch.io.'}</p></div><span className="library-total">{steam ? loading && !data.games.length ? '—' : data.trackedGames || 0 : store.loading || !store.data?.ready ? '—' : store.games.length}<span>{steam ? 'games tracked' : 'games available'}</span></span></div>
    <StoreCollectionNote platform={platform} data={store.data}/>
    <div className="library-toolbar"><GameToolbar search={route.search} genre={route.genre} sort={route.sort} genres={choices} platform={platform} onPlatform={platform => onNavigate({ platform, search: '', genre: '', sort: 'players', game: '' })} onSearch={search => onNavigate({ search }, true)} onGenre={genre => onNavigate({ genre })} onSort={sort => onNavigate({ sort }, true)} onReset={reset}/></div>
    <div className="lineup-meta"><p role="status" aria-live="polite">{loading ? 'Finding games…' : `${visible.length} matching games`}</p><span>{platformNames[platform]}{steam ? (data.rankedEntries ? ` · ${data.rankedEntries} ranked entries` : ' · Rankings loading') : ""}</span></div>
    {(error || !steam && store.data?.message) && <p className="notice" role="status">{error || store.data?.message}</p>}
    {steam ? <div className="library-list">{visible.slice(0, limit).map(game => <article className="library-row" key={game.appID}>
      <button className="library-art" onClick={() => onOpen(game.appID)} aria-label={`Open ${game.title}`}>{steamImage(game.image) && <img src={steamImage(game.image)} alt="" loading="lazy"/>}</button>
      <div className="library-info"><span className="library-id">STEAM / {game.appID}</span><h2><button onClick={() => onOpen(game.appID)}>{game.title}</button></h2><div className="library-tags">{game.genres.slice(0, 3).map(genre => <span key={genre}>{genre}</span>)}</div></div>
      <div className="library-metrics"><div><strong>{number(game.currentPlayers)}</strong><span>players now</span></div><div><strong>{number(game.peakToday)}</strong><span>peak today</span></div></div>
      <div className="library-actions"><Price price={game.price}/><Rating game={game}/><button className="secondary-button" onClick={() => onOpen(game.appID)}>Details <Icon name="arrow"/></button></div>
    </article>)}</div> : <StoreGames key={platform} games={visible.slice(0, limit)} loading={loading}/>}
    {steam && loading && !data.games.length && <div className="list-skeleton" role="status"><span className="sr-only">Loading the game library…</span>{[0,1,2].map(index => <div key={index} className="skeleton-line" aria-hidden="true"/>)}</div>}
    {!loading && !visible.length && <div className="empty-state"><Icon name="search"/><h3>{!steam && store.data?.pendingChecks > 0 ? 'Checking recent listings' : !steam && (error || !store.data?.ready) ? 'Collection not available yet' : 'No matching games'}</h3><p>Try a different title, genre or platform. Find sale filters in Discounts.</p>{(route.search || route.genre) && <button className="secondary-button" onClick={reset}>Reset filters</button>}</div>}
    {limit < visible.length && <div className="browse-actions"><button className="secondary-button" onClick={() => setLimit(value => value + 20)}>Load more games</button></div>}
  </section>;
}
