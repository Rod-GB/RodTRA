/*
 * Component: GameToolbar
 * Folder: frontend/js/components
 * File: GameToolbar.jsx
 * Purpose: Draws the All Games search and filter controls.
 */

import React from 'react';
import PlatformSelect from './PlatformSelect';

export default function GameToolbar({ search, onSearch, genre, onGenre, sort, onSort, genres, onReset, platform = 'steam', onPlatform }) {
  return <div className="toolbar">
    <label className="search-field"><span className="sr-only">{platform === 'steam' ? 'Search games by name or Steam ID' : 'Search games by name'}</span><span aria-hidden="true">⌕</span><input type="search" placeholder="Find a game…" value={search} onChange={event => onSearch(event.target.value)}/></label>
    <label className="genre-select"><span className="sr-only">Filter by genre</span><select disabled={!genres.length} value={genre} onChange={event => onGenre(event.target.value)}><option value="">{genres.length ? 'All genres' : 'No genres listed'}</option>{genres.map(value => <option key={value}>{value}</option>)}</select></label>
    {onPlatform && <PlatformSelect value={platform} onChange={onPlatform}/>}
    <label className="sort-select"><span className="sr-only">Sort games</span><select value={sort} onChange={event => onSort(event.target.value)}><option value="players">{platform === 'steam' ? 'Most played' : platform === 'itch' ? 'Newest first' : 'Ending soon'}</option>{platform === 'steam' && <option value="rating">Highest rated</option>}<option value="title">A–Z</option></select></label>
    {(search || genre || sort !== 'players') && <button className="quiet-button reset-button" onClick={onReset}>Clear filters</button>}
  </div>;
}
