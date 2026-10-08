import React from 'react';
import GameCard from './GameCard';
import Icon from './Icon';
import LoadingCards from './LoadingCards';
import { useRandomGames } from '../useRandomGames';
import { number } from '../format';

export default function GamesView({ data, loading, onOpen }) {
  const { games: picks, shuffle } = useRandomGames(data.games);
  const players = data.games.reduce((total, game) => total + game.currentPlayers, 0);
  return <section className="dashboard-view" aria-labelledby="dashboard-title">
    <div className="page-heading"><div><p className="eyebrow">Your discovery starts here</p><h1 id="dashboard-title">Find your next <span>favorite.</span></h1><p>A fresh selection from Steam’s top 100. Pick a game and explore.</p></div><a className="secondary-button" href="#/all-games">Explore all games <Icon name="arrow"/></a></div>
    <div className="overview-stats">
      <div><span className="stat-icon"><Icon name="dashboard"/></span><div><span>Games tracked</span><strong>{loading && !data.games.length ? '—' : number(data.trackedGames)}</strong></div><span className="stat-context">Steam top 100</span></div>
      <div><span className="stat-icon"><Icon name="players"/></span><div><span>Players across tracked games</span><strong>{loading && !data.games.length ? '—' : number(players)}</strong></div></div>
      <div><span className="stat-icon"><Icon name="genres"/></span><div><span>Genres to explore</span><strong>{loading && !data.games.length ? '—' : number(data.genres.length)}</strong></div><a href="#/genres" aria-label="Explore genres"><Icon name="arrow"/></a></div>
    </div>
    <div className="section-heading"><div><h2>On your radar</h2><p>Something familiar. Something unexpected.</p></div><button className="secondary-button" onClick={shuffle} disabled={!data.games.length}><Icon name="shuffle"/> Shuffle games</button></div>
    {loading && !picks.length ? <LoadingCards/> : <div className="game-grid">{picks.map(game => <GameCard key={game.appID} game={game} onOpen={onOpen}/>)}</div>}
    {!loading && !picks.length && <div className="empty-state"><Icon name="dashboard"/><h3>{data.refreshing ? 'Gathering Steam games' : 'No games available yet'}</h3><p>The collection will appear here when Steam data arrives.</p></div>}
    <a className="discovery-banner" href="#/most-played"><span className="banner-icon"><Icon name="trophy"/></span><div><h3>See where everyone is playing.</h3><p>Explore the ten most played games in our Steam collection.</p></div><span className="banner-link">View leaderboard <Icon name="arrow"/></span></a>
  </section>;
}
