import React, { useEffect, useState } from 'react';
import PatchNotes from './PatchNotes';

export default function PatchesView({ games, onOpen }) {
  const [id, setID] = useState('');
  const game = games.find(value => String(value.appID) === id);
  useEffect(() => {
    if (!games.some(value => String(value.appID) === id)) setID(games.length ? String(games[0].appID) : '');
  }, [games, id]);
  return <>
    <div className="section-heading"><h2>Patches</h2><p>Steam game updates.</p></div>
    <div className="content-controls"><label>Game <select value={id} onChange={event => setID(event.target.value)}><option value="" disabled>Choose a game</option>{games.map(value => <option key={value.appID} value={value.appID}>{value.title}</option>)}</select></label>{game && <button className="text-link" onClick={() => onOpen(game.appID)}>View game stats</button>}</div>
    {game ? <PatchNotes key={id} appID={game.appID}/> : <p className="empty-reviews">Waiting for Steam games…</p>}
  </>;
}
