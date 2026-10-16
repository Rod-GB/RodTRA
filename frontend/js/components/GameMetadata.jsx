import React from 'react';
import { timestamp } from '../format';
import { latestDeveloperPost } from '../gameInfo';

export function MetadataPanel({ releaseDate, publisher, studio, update, loading = false, error = '', updateMessage = '', storeUpdateURL = '' }) {
  return <section className="game-metadata" aria-label="Game metadata"><h3>Game information</h3><dl>
    <div><dt>Release date</dt><dd>{releaseDate || 'Not provided'}</dd></div>
    <div><dt>Latest update</dt><dd>{update ? <><a href={update.url} target="_blank" rel="noreferrer">{update.title || update.label}</a>{update.title && <small>{update.label}</small>}<small>{update.kind || 'Developer post'}</small>{updateMessage && <small>{updateMessage}</small>}</> : storeUpdateURL ? <a href={storeUpdateURL} target="_blank" rel="noreferrer">See store page ↗</a> : loading ? 'Loading…' : error ? 'Updates could not load. Try the Updates tab.' : 'No updates listed'}</dd></div>
    <div><dt>Publisher</dt><dd>{publisher || 'Not provided'}</dd></div>
    <div><dt>Developer</dt><dd>{studio || 'Not provided'}</dd></div>
  </dl></section>;
}

export default function GameMetadata({ game, pages }) {
  const post = latestDeveloperPost(pages.items);
  return <MetadataPanel releaseDate={game.releaseDate} publisher={game.publishers?.join(', ')} studio={game.developers?.join(', ')} loading={pages.loading && !pages.items.length} error={pages.error} updateMessage={pages.message}
    update={post ? { url: post.url, title: post.title, label: timestamp(post.time), kind: post.kind || (post.patch ? 'Patch notes' : 'Developer announcement') } : null}/>;
}
