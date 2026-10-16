import React from 'react';
import GameCard from './GameCard';
import Icon from './Icon';
import LoadingCards from './LoadingCards';
import { useRandomGames } from '../useRandomGames';
import { number } from '../format';
import { useRemote } from '../useRemote';

export default function GamesView({ data, loading, onOpen }) {
  const { games: picks, shuffle } = useRandomGames(data.games);
  const summary = useRemote('/api/catalog-summary', { interval: 10000 });
  const totals = summary.data;
  const players = data.games.reduce((total, game) => total + game.currentPlayers, 0);
  return <section className="dashboard-view" aria-labelledby="dashboard-title">
    <div className="page-heading"><div><p className="eyebrow">Gdaw</p><h1 id="dashboard-title">What are you <span>playing next?</span></h1><p>Popular on Steam. Free on Epic. New on itch.io.</p></div><a className="secondary-button" href="#/all-games">Browse games <Icon name="arrow"/></a></div>
    <div className="overview-stats">
      <div><span className="stat-icon"><Icon name="dashboard"/></span><div><span>Games listed</span><strong>{totals ? number(totals.totalAvailable) : '—'}</strong></div></div>
      <div><span className="stat-icon"><Icon name="players"/></span><div><span>Playing now on Steam</span><strong>{loading && !data.games.length ? '—' : number(players)}</strong></div></div>
      <div><span className="stat-icon"><Icon name="genres"/></span><div><span>Steam genres</span><strong>{loading && !data.games.length ? '—' : number(data.genres.length)}</strong></div><a href="#/genres" aria-label="Browse genres"><Icon name="arrow"/></a></div>
    </div>
    <div className="catalog-breakdown" aria-live="polite">{totals ? <>
      {[['steam','Steam'],['epic','Epic'],['itch','itch.io']].map(([key,label]) => <a key={key} href={`#/all-games?platform=${key}`}>{label} <strong>{totals[key].ready ? number(totals[key].available) : totals[key].state === 'unavailable' ? 'Unavailable' : 'Loading…'}</strong></a>)}
      {totals.itch.pending > 0 && <span className="catalog-progress">More itch.io games are loading.</span>}
      <details><summary>About these numbers</summary><p>Games are counted once per store. Player counts cover the Steam games listed here.{[totals.steam, totals.itch, totals.epic].some(source => source.stale) ? ' Some numbers are waiting for an update.' : ''}</p></details>
    </> : <p>{summary.error ? 'Game counts could not load.' : 'Loading game counts…'}</p>}</div>
    <a className="budget-entry" href="#/budget"><span><strong>Find games within your budget</strong><small>Set your price and pick up to 3 genres.</small></span><Icon name="arrow"/></a>
    <div className="section-heading"><div><h2>From Steam’s top 100</h2><p>Pick a game to see more.</p></div><button className="secondary-button" onClick={shuffle} disabled={!data.games.length}><Icon name="shuffle"/> Shuffle games</button></div>
    {loading && !picks.length ? <LoadingCards/> : <div className="game-grid">{picks.map(game => <GameCard key={game.appID} game={game} onOpen={onOpen}/>)}</div>}
    {!loading && !picks.length && <div className="empty-state"><Icon name="dashboard"/><h3>No Steam games yet</h3><p>{data.refreshing ? 'Games are loading. Check back shortly.' : 'Steam games could not load. Please try again.'}</p></div>}
    <a className="discovery-banner" href="#/most-played"><span className="banner-icon"><Icon name="trophy"/></span><div><h3>Most played on Steam</h3><p>See the top 10 games by players online.</p></div><span className="banner-link">View top 10 <Icon name="arrow"/></span></a>
  </section>;
}
