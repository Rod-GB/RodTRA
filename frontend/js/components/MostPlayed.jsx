import React from 'react';
import Icon from './Icon';
import Rating from './Rating';
import { number, steamImage } from '../format';

export default function MostPlayed({ games, loading, onOpen, cached }) {
  const leaders = games.slice(0, 10);
  const maximum = Math.max(1, leaders[0]?.currentPlayers || 0);
  return <section className="most-played-view" aria-labelledby="leaders-title">
    <div className="page-heading"><div><p className="eyebrow">The Steam leaderboard</p><h1 id="leaders-title">Most <span>played.</span></h1><p>The top ten in our collection, ranked by players right now.</p></div><span className="live-pill"><span className={`status-dot ${cached ? 'cached' : ''}`}/>{cached ? 'Saved player counts' : 'Auto-updating counts'}</span></div>
    {!!leaders.length && <div className="podium">{leaders.slice(0, 3).map((game, index) => <button key={game.appID} className={`podium-card podium-${index + 1}`} onClick={() => onOpen(game.appID)}>
      <div className="podium-art">{steamImage(game.image) && <img src={steamImage(game.image)} alt=""/>}<span className="podium-rank">{index === 0 && <Icon name="trophy"/>}#{index + 1}</span></div>
      <div className="podium-content"><h2>{game.title}</h2><p><strong>{number(game.currentPlayers)}</strong><span>players now</span></p></div>
    </button>)}</div>}
    <div className="section-heading"><div><h2>Top 10</h2><p>Player counts refresh automatically.</p></div><span className="muted small">Steam players only</span></div>
    {!!leaders.length && <div className="leaderboard-scroll"><table className="leaderboard"><caption className="sr-only">Top ten games by current Steam player count</caption><thead><tr><th scope="col">Rank</th><th scope="col">Game</th><th scope="col">Players now</th><th scope="col">Peak today</th><th scope="col">Rating</th><th scope="col"><span className="sr-only">Game details</span></th></tr></thead><tbody>{leaders.map((game, index) => <tr key={game.appID}>
      <td><span className={`leader-rank ${index < 3 ? 'top-rank' : ''}`}>{String(index + 1).padStart(2, '0')}</span></td>
      <td><button className="leader-game" onClick={() => onOpen(game.appID)}>{steamImage(game.image) && <img src={steamImage(game.image)} alt="" loading="lazy"/>}<span><strong>{game.title}</strong><span>{game.genres.slice(0, 2).join(' · ')}</span></span></button></td>
      <td><div className="leader-count"><strong>{number(game.currentPlayers)}</strong><div className="player-bar" aria-hidden="true"><span style={{ width: `${game.currentPlayers / maximum * 100}%` }}/></div></div></td><td className="leader-peak">{number(game.peakToday)}</td><td><Rating game={game}/></td>
      <td><button className="icon-button" onClick={() => onOpen(game.appID)} aria-label={`View ${game.title} details`}><Icon name="arrow"/></button></td>
    </tr>)}</tbody></table></div>}
    {loading && !leaders.length && <div className="list-skeleton" role="status"><span className="sr-only">Loading leaderboard…</span>{[0, 1, 2].map(index => <div key={index} className="skeleton-line" aria-hidden="true"/>)}</div>}
    {!loading && !leaders.length && <div className="empty-state"><Icon name="trophy"/><h3>Waiting for player counts</h3><p>The leaderboard appears when Steam data arrives.</p></div>}
  </section>;
}