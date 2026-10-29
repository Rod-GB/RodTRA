/*
 * Component: GenresView
 * Folder: frontend/js/components
 * File: GenresView.jsx
 * Purpose: Shows genre categories and their games, with a separate category
 *   for Epic games whose genres are unknown.
 */

import React from 'react';
import GenreGrid from './GenreGrid';
import GameCard from './GameCard';
import LoadingCards from './LoadingCards';
import Icon from './Icon';
import PlatformSelect, { platformNames } from './PlatformSelect';
import { useStoreGames } from '../useStoreGames';
import StoreGames from './StoreGames';
import StoreCollectionNote from './StoreCollectionNote';
import { routeURL } from '../navigation';
import { gameImage } from '../format';

export default function GenresView({ data, route, loading, onOpen, onNavigate }) {
  const platform = route.platform || 'steam', steam = platform === 'steam';
  const store = useStoreGames(platform);
  const collection = steam ? data.games : store.games;
  const genres = [...new Set(collection.flatMap(game => game.genres || []))].sort((a, b) => a.localeCompare(b));
  loading = steam ? loading : store.loading;
  const selected = route.genre;
  const otherFree = platform === 'epic' ? collection.filter(game => !game.genres?.length) : [];
  const otherSelected = platform === 'epic' && selected === 'other-free-games';
  const games = otherSelected ? otherFree : selected ? collection.filter(game =>
    game.genres?.some(genre => genre.toLowerCase() === selected.toLowerCase())) : [];
  const waiting = (loading || steam && data.refreshing) && !collection.length;

  return <section className="genres-view" aria-labelledby="genres-title">
    <div className="page-heading">
      <div><p className="eyebrow">Explore by genre</p>
        <h1 id="genres-title">{otherSelected ? 'Other free games' : selected || <>Browse by <span>genre.</span></>}</h1>
        <p>{otherSelected ? 'Free games with no genre listed yet.' : selected ? `Games in the ${selected} genre.` : platform === 'epic' ? 'Free games on Epic.' : 'Choose a genre.'}</p>
      </div>
      <div className="genre-page-controls"><PlatformSelect value={platform} onChange={platform => onNavigate({ platform, genre: '', game: '' })}/>
      {selected && <a className="secondary-button" href={routeURL({ view: 'genres', platform })}>← All genres</a>}</div>
    </div>
    <StoreCollectionNote platform={platform} data={store.data}/>
    {!steam && (store.error || store.data?.message) && <p className="notice" role="status">{store.error || store.data?.message}</p>}
    {selected ? <>
      <div className="genre-intro"><p role="status" aria-live="polite">
        {waiting ? 'Loading games…' : `${games.length} ${games.length === 1 ? 'game' : 'games'}${otherSelected ? '' : ' in this genre'}`}
      </p></div>
      {waiting ? <LoadingCards/> : games.length ?
        steam ? <div className="game-grid">{games.map(game => <GameCard key={game.appID} game={game} onOpen={onOpen}/>)}</div> : <StoreGames key={platform} games={games}/> :
        <div className="empty-state"><Icon name="genres"/><h3>No games in this genre yet</h3><p>Choose another genre or check back as the collection updates.</p></div>}
    </> : <>
      <div className="genre-intro">{genres.length > 0 && <span>{genres.length} {genres.length === 1 ? 'genre' : 'genres'}</span>}<p>{platformNames[platform]}</p></div>
      <GenreGrid games={collection} genres={genres} platform={platform}>
      {!!otherFree.length && <a className="genre-tile genre-tone-0" href={routeURL({ view: 'genres', platform, genre: 'other-free-games' })}>
        <div className="genre-collage" aria-hidden="true">{otherFree.slice(0, 3).map(game => gameImage(game.image) && <img key={game.id} src={gameImage(game.image)} alt="" loading="lazy"/>)}</div>
        <div className="genre-tile-content"><span className="genre-count">{otherFree.length} {otherFree.length === 1 ? 'game' : 'games'}</span><h2>Other free games</h2><span className="genre-tile-action">Browse games <Icon name="arrow"/></span></div>
      </a>}
      </GenreGrid>
      {!genres.length && !otherFree.length && <p className="small muted" role="status">{waiting ? 'Loading genres…' : platform === 'epic' ? 'No free games right now.' : 'No genres listed yet.'}</p>}
    </>}
  </section>;
}
