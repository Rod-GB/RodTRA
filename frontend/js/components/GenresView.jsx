import React from 'react';
import GenreGrid from './GenreGrid';
import GameCard from './GameCard';
import LoadingCards from './LoadingCards';
import Icon from './Icon';

export default function GenresView({ data, route, loading, onOpen }) {
  const selected = route.genre;
  const games = selected ? data.games.filter(game =>
    game.genres.some(genre => genre.toLowerCase() === selected.toLowerCase())) : [];
  const waiting = (loading || data.refreshing) && !data.games.length;

  return <section className="genres-view" aria-labelledby="genres-title">
    <div className="page-heading">
      <div><p className="eyebrow">Explore by genre</p>
        <h1 id="genres-title">{selected || <>Play your <span>way.</span></>}</h1>
        <p>{selected ? `Games in the ${selected} genre.` : 'Choose a genre to see its games.'}</p>
      </div>
      {selected && <a className="secondary-button" href="#/genres">← All genres</a>}
    </div>
    {selected ? <>
      <div className="genre-intro"><p role="status" aria-live="polite">
        {waiting ? 'Loading games…' : `${games.length} ${games.length === 1 ? 'game' : 'games'} in this genre`}
      </p></div>
      {waiting ? <LoadingCards/> : games.length ?
        <div className="game-grid">{games.map(game => <GameCard key={game.appID} game={game} onOpen={onOpen}/>)}</div> :
        <div className="empty-state"><Icon name="genres"/><h3>No games in this genre yet</h3><p>Choose another genre or check back as the collection updates.</p></div>}
    </> : <>
      <div className="genre-intro"><span>{data.genres.length} genres</span><p>From the games in our Steam collection.</p></div>
      <GenreGrid games={data.games} genres={data.genres}/>
      {!data.genres.length && <div className="empty-state"><Icon name="genres"/><h3>{loading || data.refreshing ? 'Gathering genres' : 'Genres are not available yet'}</h3><p>Categories appear as Steam game details arrive.</p></div>}
    </>}
  </section>;
}
