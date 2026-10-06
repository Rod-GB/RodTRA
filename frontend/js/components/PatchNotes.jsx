import React from 'react';
import { date, timestamp } from '../format';
import { useSteamPages } from '../useSteamPages';
import { patchText } from '../patchText';
import Icon from './Icon';

export { patchText } from '../patchText';

function PatchBody({ text }) {
  const blocks = [];
  for (const line of patchText(text).split('\n').filter(Boolean)) {
    if (line.startsWith('• ')) {
      if (blocks.at(-1)?.kind !== 'list') blocks.push({ kind: 'list', items: [] });
      blocks.at(-1).items.push(line.slice(2));
    } else blocks.push({ kind: line.startsWith('## ') ? 'heading' : 'paragraph', text: line.replace(/^## /, '') });
  }
  return <div className="patch-body">{blocks.map((block, index) => block.kind === 'list' ? <ul key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul> : block.kind === 'heading' ? <h5 key={index}>{block.text}</h5> : <p key={index}>{block.text}</p>)}</div>;
}

export default function PatchNotes({ appID }) {
  const pages = useSteamPages('patches', appID);
  return <section className="patches-section" aria-label="Steam patch notes and updates">
    <div className="reviews-heading"><div><h3>Patches & updates</h3><p className="small muted">The latest news and patch notes from the developers.</p></div><button className="secondary-button" disabled={pages.loading} onClick={pages.refresh}>Refresh</button></div>
    {pages.updatedAt > 0 && <p className="small muted">Fetched: {timestamp(pages.updatedAt)}</p>}
    {pages.error && <p className="notice" role="alert">{pages.error} <button className="quiet-button" disabled={pages.loading} onClick={pages.items.length ? pages.loadMore : pages.refresh}>Retry</button></p>}
    <div className="patch-list">{pages.items.map((post, index) => <article className="patch-card" key={post.id}>
      <div className="patch-meta"><span>{post.patch ? 'Patch notes' : 'Developer update'}</span><time dateTime={new Date(post.time * 1000).toISOString()}>{date(post.time)}</time></div>
      <h4><a href={post.url} target="_blank" rel="noreferrer">{post.title}</a></h4>
      <details className="patch-content" open={index === 0}><summary>Read update</summary><PatchBody text={post.text}/></details>
      <a className="patch-source" href={post.url} target="_blank" rel="noreferrer">Full post on Steam <Icon name="arrow"/></a>
    </article>)}</div>
    {!pages.items.length && <p className="empty-reviews">{pages.loading ? 'Loading Steam updates…' : pages.error ? 'Updates could not be loaded.' : 'No developer updates available from this Steam feed.'}</p>}
    <div className="browse-actions">{pages.hasMore && <button className="primary-button" disabled={pages.loading} onClick={pages.loadMore}>{pages.loading ? 'Loading…' : 'Older updates'}</button>}<a className="text-link" href={`https://store.steampowered.com/news/app/${appID}`} target="_blank" rel="noreferrer">All updates on Steam</a></div>
  </section>;
}
