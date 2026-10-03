import React from 'react';

export default function GameToolbar({ search, onSearch, genre, onGenre, sort, onSort, genres, randomOption, onReset }) {
  return <div className="toolbar">
    <label className="search-field"><span className="sr-only">Search games by name or Steam ID</span><span aria-hidden="true">⌕</span><input type="search" placeholder="Find a game or Steam ID…" value={search} onChange={event => onSearch(event.target.value)}/></label>
    <label className="genre-select"><span className="sr-only">Filter by genre</span><select value={genre} onChange={event => onGenre(event.target.value)}><option value="">All genres</option>{genres.map(value => <option key={value}>{value}</option>)}</select></label>
    <label className="sort-select"><span className="sr-only">Sort games</span><select value={sort} onChange={event => onSort(event.target.value)}>{randomOption && <option value="random">Random picks</option>}<option value="players">Player count</option><option value="rating">Rating</option><option value="title">Game name</option></select></label>
    {(search || genre || sort !== (randomOption ? 'random' : 'players')) && <button className="quiet-button reset-button" onClick={onReset}>Reset</button>}
  </div>;
}
