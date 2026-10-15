import React from 'react';
import { useRemote } from '../useRemote';
import { timestamp } from '../format';

export function MetadataPanel({ releaseDate, publisher, studio, update }) {
  return <section className="game-metadata" aria-label="Game metadata"><h3>Game information</h3><dl>
    <div><dt>Release date</dt><dd>{releaseDate || 'Not provided'}</dd></div>
    <div><dt>Latest update</dt><dd>{update ? <a href={update.url} target="_blank" rel="noreferrer">{update.label}</a> : 'Not provided'}</dd></div>
    <div><dt>Publisher</dt><dd>{publisher || 'Not provided'}</dd></div>
    <div><dt>Studio / Developer</dt><dd>{studio || 'Not provided'}</dd></div>
  </dl></section>;
}

export default function GameMetadata({ game }) {
  const { data } = useRemote(`/api/patches?id=${game.appID}`);
  const patch = data?.posts?.find(post => post.patch && /^https:\/\//.test(post.url));
  return <MetadataPanel releaseDate={game.releaseDate} publisher={game.publishers?.join(', ')} studio={game.developers?.join(', ')} update={patch ? { url: patch.url, label: timestamp(patch.time) } : null}/>;
}
