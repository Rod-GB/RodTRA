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

export default function GenresView({ data, route, loading, onOpen, onNavigate }) {
  const platform = route.platform || 'steam', steam = platform === 'steam';
  const store = useStoreGames(platform);
  const collection = steam ? data.games : store.games;
  const genres = [...new Set(collection.flatMap(game => game.genres || []))].sort((a, b) => a.localeCompare(b));
  loading = steam ? loading : store.loading;
  const selected = route.genre;
  const games = selected ? collection.filter(game =>
    game.genres?.some(genre => genre.toLowerCase() === selected.toLowerCase())) : [];
  const waiting = (loading || steam && data.refreshing) && !collection.length;

  return <section className="genres-view" aria-labelledby="genres-title">
    <div className="page-heading">
      <div><p className="eyebrow">Explore by genre</p>
        <h1 id="genres-title">{selected || <>Browse by <span>genre.</span></>}</h1>
        <p>{selected ? `Games in the ${selected} genre.` : platform === 'epic' ? 'Free games on Epic.' : 'Choose a genre.'}</p>
      </div>
      <div className="genre-page-controls"><PlatformSelect value={platform} onChange={platform => onNavigate({ platform, genre: '', game: '' })}/>
      {selected && <a className="secondary-button" href={routeURL({ view: 'genres', platform })}>← All genres</a>}</div>
    </div>
    <StoreCollectionNote platform={platform} data={store.data}/>
    {!steam && (store.error || store.data?.message) && <p className="notice" role="status">{store.error || store.data?.message}</p>}
    {selected ? <>
      <div className="genre-intro"><p role="status" aria-live="polite">
        {waiting ? 'Loading games…' : `${games.length} ${games.length === 1 ? 'game' : 'games'} in this genre`}
      </p></div>
      {waiting ? <LoadingCards/> : games.length ?
        steam ? <div className="game-grid">{games.map(game => <GameCard key={game.appID} game={game} onOpen={onOpen}/>)}</div> : <StoreGames key={platform} games={games}/> :
        <div className="empty-state"><Icon name="genres"/><h3>No games in this genre yet</h3><p>Choose another genre or check back as the collection updates.</p></div>}
    </> : <>
      <div className="genre-intro">{genres.length > 0 && <span>{genres.length} {genres.length === 1 ? 'genre' : 'genres'}</span>}<p>{platformNames[platform]}</p></div>
      <GenreGrid games={collection} genres={genres} platform={platform}/>
      {!genres.length && <p className="small muted" role="status">{platform === 'epic' ? 'Epic doesn’t list genres for these free games.' : waiting ? 'Loading genres…' : 'These games have no genres listed.'}</p>}
      {!steam && (!genres.length || collection.some(game => !game.genres?.length)) && <><div className="section-heading"><h2>{!genres.length ? 'Available games' : 'More games'}</h2></div><StoreGames key={platform} games={collection.filter(game => !game.genres?.length)} loading={loading}/></>}
    </>}
  </section>;
}
