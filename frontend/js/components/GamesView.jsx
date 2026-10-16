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
    <div className="page-heading"><div><p className="eyebrow">Your discovery starts here</p><h1 id="dashboard-title">Find your next <span>favorite.</span></h1><p>A fresh selection from Steam’s top 100. Pick a game and explore.</p></div><a className="secondary-button" href="#/all-games">Explore all games <Icon name="arrow"/></a></div>
    <div className="overview-stats">
      <div><span className="stat-icon"><Icon name="dashboard"/></span><div><span>Games available</span><strong>{!totals ? '—' : `${number(totals.totalAvailable)}${totals.complete ? '' : '+'}`}</strong></div><span className="stat-context">Across three stores</span></div>
      <div><span className="stat-icon"><Icon name="players"/></span><div><span>Players across tracked Steam games</span><strong>{loading && !data.games.length ? '—' : number(players)}</strong></div></div>
      <div><span className="stat-icon"><Icon name="genres"/></span><div><span>Genres to explore</span><strong>{loading && !data.games.length ? '—' : number(data.genres.length)}</strong></div><a href="#/genres" aria-label="Explore genres"><Icon name="arrow"/></a></div>
    </div>
    <div className="catalog-breakdown" aria-live="polite">{totals ? <>
      <span>Steam: {totals.steam.ready ? number(totals.steam.available) : 'Loading'} games / {totals.steam.ranked ? `${number(totals.steam.ranked)} ranked entries` : 'rankings loading'}</span>
      <span>itch.io: {totals.itch.ready ? number(totals.itch.available) : totals.itch.state === 'unavailable' ? 'Unavailable' : 'Loading'}{totals.itch.pending > 0 ? ` · ${totals.itch.pending} awaiting checks` : ''}</span>
      <span>Epic: {totals.epic.ready ? number(totals.epic.available) : totals.epic.state === 'unavailable' ? 'Unavailable' : 'Loading'} active giveaways</span>
      <small>{!totals.complete ? '+ Collections are still loading or being checked. ' : ''}Counts are per store; the same game can appear on more than one store.{[totals.steam, totals.itch, totals.epic].some(source => source.stale) ? ' Some sources are awaiting refresh.' : ''}</small>
    </> : <p>{summary.error || 'Counting the available collections…'}</p>}</div>
    <div className="section-heading"><div><h2>On your radar</h2><p>Something familiar. Something unexpected.</p></div><button className="secondary-button" onClick={shuffle} disabled={!data.games.length}><Icon name="shuffle"/> Shuffle games</button></div>
    <a className="budget-entry" href="#/budget"><span><strong>Find games suitable for your budget</strong><small>Choose your budget and rating. Get matches with clear reasons.</small></span><Icon name="arrow"/></a>
    {loading && !picks.length ? <LoadingCards/> : <div className="game-grid">{picks.map(game => <GameCard key={game.appID} game={game} onOpen={onOpen}/>)}</div>}
    {!loading && !picks.length && <div className="empty-state"><Icon name="dashboard"/><h3>{data.refreshing ? 'Gathering Steam games' : 'No games available yet'}</h3><p>The collection will appear here when Steam data arrives.</p></div>}
    <a className="discovery-banner" href="#/most-played"><span className="banner-icon"><Icon name="trophy"/></span><div><h3>See where everyone is playing.</h3><p>Explore the ten most played games in our Steam collection.</p></div><span className="banner-link">View leaderboard <Icon name="arrow"/></span></a>
  </section>;
}
