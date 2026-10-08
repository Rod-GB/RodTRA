import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useGames } from './useGames';
import Masthead from './components/Masthead';
import Sidebar from './components/Sidebar';
import GamesView from './components/GamesView';
import GenresView from './components/GenresView';
import MostPlayed from './components/MostPlayed';
import GameDetails from './components/GameDetails';
import AllGamesView from './components/AllGamesView';
import UpdatesView from './components/UpdatesView';
import { timestamp } from './format';
import { readRoute, routeURL } from './navigation';

function Dashboard() {
  const [route, setRoute] = useState(readRoute);
  const [menuOpen, setMenuOpen] = useState(false);
  const content = useRef(null);
  const opener = useRef(null);
  const overview = useGames('', '', 'players');
  const { data, error, loading } = overview;
  const sourceTime = data.games[0]?.playersUpdatedAt;
  const stale = !!sourceTime && Date.now() / 1000 - sourceTime > 600;
  const cached = !!(error || stale || data.playersStatus === 'reconnecting');
  const status = error || data.playersStatus === 'reconnecting' ? 'Reconnecting' : stale ? 'Saved counts' : data.playersStatus === 'connecting' || loading ? 'Connecting' : 'Connected';

  useEffect(() => {
    const sync = () => setRoute(readRoute());
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  useEffect(() => {
    const size = window.matchMedia('(max-width: 720px)');
    const closeOnDesktop = () => { if (!size.matches) setMenuOpen(false); };
    size.addEventListener('change', closeOnDesktop);
    return () => size.removeEventListener('change', closeOnDesktop);
  }, []);
  useEffect(() => {
    setMenuOpen(false);
    content.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [route.view, route.genre]);
  useEffect(() => {
    if (!route.game && opener.current) {
      if (opener.current.isConnected) opener.current.focus({ preventScroll: true });
      opener.current = null;
    }
  }, [route.game]);

  const navigate = (changes, replace = false) => {
    const next = { ...route, ...changes };
    if (replace) {
      window.history.replaceState(null, '', routeURL(next));
      setRoute(readRoute());
    } else window.location.hash = routeURL(next);
  };
  const openGame = appID => {
    opener.current = document.activeElement;
    navigate({ game: String(appID), tab: 'overview' });
  };

  return <>
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); content.current?.focus(); }}>Skip to content</a>
    <Masthead view={route.view} status={status} cached={cached} menuOpen={menuOpen} onMenu={() => setMenuOpen(value => !value)}/>
    {menuOpen && <button className="sidebar-backdrop" aria-label="Dismiss navigation" onClick={() => setMenuOpen(false)}/>}
    <Sidebar view={route.view} open={menuOpen} onNavigate={() => setMenuOpen(false)}/>
    <main id="main-content" className="workspace" ref={content} tabIndex={-1} inert={menuOpen}>
      <div className="steam-updates"><span><span className={`status-dot ${cached ? 'cached' : ''}`}/>Steam updates</span><span>{sourceTime ? `Steam data as of ${timestamp(sourceTime)}` : 'Connecting to Steam…'}</span></div>
      {(error || data.message) && <p className="notice" role="status">{error || data.message}</p>}
      {stale && !error && !data.message && <p className="notice" role="status">Showing saved player counts while Steam reconnects.</p>}
      {route.view === 'dashboard' ? <GamesView data={data} loading={loading} onOpen={openGame}/> :
        route.view === 'all-games' ? <AllGamesView genres={data.genres} route={route} onNavigate={navigate} onOpen={openGame}/> :
        route.view === 'updates' ? <UpdatesView games={data.games} route={route} onNavigate={navigate} onOpen={openGame}/> :
        route.view === 'genres' ? <GenresView data={data} route={route} onNavigate={navigate} onOpen={openGame}/> :
        <MostPlayed games={data.games} loading={loading} onOpen={openGame} cached={cached}/>}
      <footer className="page-footer"><span className="footer-brand">Gdaw<span>.</span></span><p>Discover your next game. Powered by Steam data.</p><span>Independent of Valve.</span></footer>
    </main>
    {route.game && <GameDetails key={route.game} appID={Number(route.game)} section={route.tab} onSection={tab => navigate({ tab }, true)} onClose={() => navigate({ game: '', tab: 'overview' })}/>}
  </>;
}

createRoot(document.getElementById('app')).render(<Dashboard/>);
