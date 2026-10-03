import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useGames } from './useGames';
import Masthead from './components/Masthead';
import GamesView from './components/GamesView';
import FeaturedGame from './components/FeaturedGame';
import GenreGrid from './components/GenreGrid';
import PatchesView from './components/PatchesView';
import GameDetails from './components/GameDetails';
import { timestamp } from './format';

function Dashboard() {
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [sort, setSort] = useState('random');
  const [view, setView] = useState('games');
  const [browsing, setBrowsing] = useState(false);
  const [detailID, setDetailID] = useState(null);
  const section = useRef(null);
  const overview = useGames('', '', 'players');
  const filtered = useGames(search, genre, sort);
  const { data, loading } = filtered;
  const featured = overview.data.games[0];
  const sourceTime = featured?.playersUpdatedAt;
  const stale = sourceTime && Date.now() / 1000 - sourceTime > 600;
  const reset = () => { setSearch(''); setGenre(''); setSort(view === 'games' ? 'random' : 'players'); };
  const moveToContent = () => requestAnimationFrame(() => section.current?.scrollIntoView({ block: 'start' }));
  const changeView = value => { setView(value); setBrowsing(false); reset(); setSort(value === 'games' ? 'random' : 'players'); moveToContent(); };
  const browseGenre = value => { reset(); setSort('players'); setGenre(value); setView('genres'); setBrowsing(true); moveToContent(); };
  const showMore = () => { setView('genres'); setBrowsing(false); moveToContent(); };
  const active = view === 'games' || browsing ? filtered : overview;
  const gameProps = { data, loading, search, genre, sort, onSearch: setSearch, onGenre: setGenre, onSort: setSort, onReset: reset, onMore: showMore, onOpen: setDetailID };
  return <>
    <a className="skip-link" href="#games">Skip to games</a>
    <Masthead view={view} onView={changeView} cached={!!(overview.error || stale || overview.data.message)} status={overview.error ? 'Offline' : overview.data.refreshing ? 'Updating…' : 'Steam data'}/>
    <main className="shell"><section className="hero" aria-labelledby="hero-title"><div className="hero-copy">
      <p className="eyebrow"><span className="square-dot"/> STEAM GAMES</p><h1 id="hero-title">Rod<span>TRA</span></h1>
      <p className="hero-intro">Player counts, ratings, reviews, and updates.</p><button className="text-link" onClick={() => changeView('games')}>View games</button>
      <div className="hero-footnote"><span>8 RANDOM PICKS</span><span>UPDATED AUTOMATICALLY</span></div>
    </div><FeaturedGame game={featured} onOpen={setDetailID}/></section>
    <div className="snapshot-strip"><span className="snapshot-label"><span className="square-dot"/>{overview.error ? 'Connection lost' : stale ? 'Saved Steam data' : 'Steam snapshot'}</span><span className="export-time">{sourceTime ? `Updated: ${timestamp(sourceTime)}` : 'Connecting to Steam…'}</span></div>
    {(active.error || active.data.message) && <p className="notice" role="status">{active.error || active.data.message}</p>}
    <section ref={section} id="games" className="games-section" aria-label={view === 'games' ? 'Steam games' : view === 'genres' ? 'Steam game genres' : 'Steam game patches'}>
      {view === 'games' ? <GamesView {...gameProps} browse={false}/> : view === 'patches' ? <PatchesView games={overview.data.games} onOpen={setDetailID}/> : browsing ? <>
        <button className="text-link back-to-genres" onClick={() => { setBrowsing(false); moveToContent(); }}>All genres</button><GamesView {...gameProps} browse/>
      </> : <><div className="section-heading"><h2>Genres</h2><p>Find more games.</p></div><p className="collection-note small muted">{overview.data.trackedGames} games from Steam’s top 100. Details load automatically.</p><button className="text-link all-games-link" onClick={() => browseGenre('')}>Browse all games</button><GenreGrid games={overview.data.games} genres={overview.data.genres} onBrowse={browseGenre} onOpen={setDetailID}/></>}
    </section>
    <footer className="page-footer"><span>RodTRA</span><p>Steam data · Counts and ratings refresh automatically</p></footer>
    </main>{detailID && <GameDetails key={detailID} appID={detailID} onClose={() => setDetailID(null)}/>}
  </>;
}

createRoot(document.getElementById('app')).render(<Dashboard/>);
