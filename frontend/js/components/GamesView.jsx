import React, { useEffect, useState } from 'react';
import GameCard from './GameCard';
import GameToolbar from './GameToolbar';
import { useRandomGames } from '../useRandomGames';

export default function GamesView({ data, loading, browse, search, genre, sort, onSearch, onGenre, onSort, onReset, onMore, onOpen }) {
  const [limit, setLimit] = useState(24);
  const picks = useRandomGames(data.games);
  const random = !browse && sort === 'random';
  const visible = random ? picks : data.games.slice(0, browse ? limit : 8);
  useEffect(() => setLimit(24), [search, genre, sort, browse]);
  const order = sort === 'rating' ? 'Sorted by rating.' : sort === 'title' ? 'Sorted by game name.' : 'Ranked by player count.';
  return <>
    <div className="section-heading"><h2>{browse ? genre || 'All games' : 'Games'}</h2><p>{random ? 'Eight random picks.' : order}</p></div>
    <GameToolbar search={search} genre={genre} sort={sort} genres={data.genres} randomOption={!browse} onSearch={onSearch} onGenre={onGenre} onSort={onSort} onReset={onReset}/>
    <div className="lineup-meta"><p role="status" aria-live="polite">{visible.length} of {data.games.length} {browse ? 'matching' : 'available'} games</p><span>STEAM PLAYERS ONLY</span></div>
    <div className="game-grid">{visible.map((game, index) => <GameCard key={game.appID} game={game} rank={random ? null : index + 1} onOpen={onOpen}/>)}</div>
    {!visible.length && <div className="empty-state"><h3>{loading || (random && data.games.length > 0) || (!data.trackedGames && data.refreshing) ? 'Loading Steam games…' : 'No games found.'}</h3><p className="small muted">Search covers the games currently collected from Steam’s top 100.</p>{(search || genre) && <button className="primary-button" onClick={onReset}>Reset filters</button>}</div>}
    <div className="browse-actions">{!browse ? <button className="primary-button" onClick={onMore}>See more</button> : visible.length < data.games.length && <button className="primary-button" onClick={() => setLimit(value => value + 24)}>Load more games</button>}</div>
  </>;
}
