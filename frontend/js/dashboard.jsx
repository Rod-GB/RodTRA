import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useGames } from './useGames';
import GameCard from './components/GameCard';
import FeaturedGame from './components/FeaturedGame';
import GenreGrid from './components/GenreGrid';
import GameDetails from './components/GameDetails';
import { timestamp } from './format';

function Dashboard() {
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [sort, setSort] = useState('players');
  const [view, setView] = useState('games');
  const [detailID, setDetailID] = useState(null);
  const overview = useGames('', '', 'players');
  const filtered = useGames(search, genre, sort);
  const { data, error, loading } = view === 'games' ? filtered : overview;
  const featured = overview.data.games[0];
  const sourceTime = featured?.playersUpdatedAt;
  const stale = sourceTime && Date.now() / 1000 - sourceTime > 300;
  const reset = () => { setSearch(''); setGenre(''); setSort('players'); };
  const browseGenre = value => { setGenre(value); setSearch(''); setSort('players'); setView('games'); };
  return <>
    <a className="skip-link" href="#games">Skip to games</a>
    <header className="masthead"><a className="brand" href="/" aria-label="RodTRA home"><span className="brand-mark" aria-hidden="true">R</span><span>RodTRA</span></a>
      <nav className="main-nav" aria-label="Main views"><button aria-pressed={view === 'games'} onClick={() => setView('games')}>Games</button><button aria-pressed={view === 'genres'} onClick={() => setView('genres')}>Genres</button></nav>
      <span className="edition"><span className={`status-dot ${error || stale || data.message ? 'cached' : ''}`}/>{error ? 'Offline' : data.refreshing ? 'Updating…' : 'Steam data'}</span>
    </header>
    <main className="shell"><section className="hero" aria-labelledby="hero-title"><div className="hero-copy">
      <p className="eyebrow"><span className="square-dot"/> STEAM GAMES</p><h1 id="hero-title">Rod<span>TRA</span><span className="heading-arrow" aria-hidden="true">↗</span></h1>
      <p className="hero-intro">Player counts, ratings, and reviews.</p><a className="text-link" href="#games" onClick={() => setView('games')}>View games <span aria-hidden="true">↓</span></a>
      <div className="hero-footnote"><span>8 GAMES</span><span>UPDATED AUTOMATICALLY</span></div>
    </div><FeaturedGame game={featured} onOpen={setDetailID}/></section>
    <div className="snapshot-strip"><span className="snapshot-label"><span className="square-dot"/>{error ? 'Connection lost' : stale ? 'Saved Steam data' : 'Steam snapshot'}</span>
      <span className="export-time">{sourceTime ? `Updated: ${timestamp(sourceTime)}` : 'Connecting to Steam…'}</span></div>
    {(error || data.message) && <p className="notice" role="status">{error || data.message}</p>}
    <section id="games" className="games-section" aria-label={view === 'games' ? 'Ranked Steam games' : 'Steam game genres'}>
      <div className="section-heading"><h2>{view === 'games' ? 'Games' : 'Genres'}</h2><p>{view === 'genres' ? 'Browse the top 8 games.' : sort === 'rating' ? 'Sorted by rating.' : sort === 'title' ? 'Sorted by game name.' : 'Ranked by player count.'}</p></div>
      {view === 'games' ? <>
        <div className="toolbar"><label className="search-field"><span className="sr-only">Search games by name or Steam ID</span><span aria-hidden="true">⌕</span><input type="search" placeholder="Find a game or Steam ID…" value={search} onChange={event => setSearch(event.target.value)}/></label>
          <label className="genre-select"><span className="sr-only">Filter by genre</span><select value={genre} onChange={event => setGenre(event.target.value)}><option value="">All genres</option>{data.genres.map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="sort-select"><span className="sr-only">Sort games</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="players">Player count</option><option value="rating">Rating</option><option value="title">Game name</option></select></label>
          {(search || genre || sort !== 'players') && <button className="quiet-button reset-button" onClick={reset}>Reset</button>}
        </div>
        <div className="lineup-meta"><p role="status" aria-live="polite">{data.games.length} of {data.trackedGames || 8} games</p><span>STEAM PLAYERS ONLY</span></div>
        <div className="game-grid">{data.games.map((game, index) => <GameCard key={game.appID} game={game} rank={index + 1} onOpen={setDetailID}/>)}</div>
        {!data.games.length && <div className="empty-state"><h3>{loading || (!data.trackedGames && data.refreshing) ? 'Loading Steam games…' : 'No games found.'}</h3>{(search || genre) && <button className="primary-button" onClick={reset}>Reset filters</button>}</div>}
      </> : <GenreGrid games={overview.data.games} genres={overview.data.genres} onBrowse={browseGenre} onOpen={setDetailID}/>}
    </section>
    <footer className="page-footer"><span>RodTRA</span><p>Steam data · Counts checked every minute · Reviews every 10 minutes</p></footer>
    </main>{detailID && <GameDetails key={detailID} appID={detailID} onClose={() => setDetailID(null)}/>}
  </>;
}

createRoot(document.getElementById('app')).render(<Dashboard/>);
