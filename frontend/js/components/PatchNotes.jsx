import React from 'react';
import { date, timestamp, plainText } from '../format';
import { useSteamPages } from '../useSteamPages';

export function patchText(value) {
  return plainText(value.replace(/\[img\][\s\S]*?\[\/img\]/gi, '').replace(/\[\*\]/g, '\n• ').replace(/\[\/?(?:h[1-6]|list|olist|quote)[^\]]*\]/gi, '\n').replace(/\[\/?[a-z][^\]]*\]/gi, '').replace(/\{STEAM_CLAN_IMAGE\}[^\s]*/g, '')).trim();
}

export default function PatchNotes({ appID }) {
  const pages = useSteamPages('patches', appID);
  return <section className="patches-section" aria-label="Steam patch notes and updates">
    <div className="reviews-heading"><div><h3>Patches & updates</h3><p className="small muted">Developer posts from Steam. Patch notes are labelled when Steam supplies the tag.</p></div><button className="quiet-button" disabled={pages.loading} onClick={pages.refresh}>Refresh</button></div>
    {pages.updatedAt > 0 && <p className="small muted">Fetched: {timestamp(pages.updatedAt)}</p>}
    {pages.error && <p className="notice" role="alert">{pages.error} <button className="quiet-button" disabled={pages.loading} onClick={pages.items.length ? pages.loadMore : pages.refresh}>Retry</button></p>}
    <div className="patch-list">{pages.items.map(post => <article className="patch-card" key={post.id}>
      <div className="patch-meta"><span>{post.patch ? 'Patch notes' : 'Developer update'}</span><time dateTime={new Date(post.time * 1000).toISOString()}>{date(post.time)}</time></div>
      <h4><a href={post.url} target="_blank" rel="noreferrer">{post.title}</a></h4><p className="patch-text">{patchText(post.text)}</p><a className="text-link" href={post.url} target="_blank" rel="noreferrer">Full post on Steam</a>
    </article>)}</div>
    {!pages.items.length && <p className="empty-reviews">{pages.loading ? 'Loading Steam updates…' : pages.error ? 'Updates could not be loaded.' : 'No developer updates available from this Steam feed.'}</p>}
    <div className="browse-actions">{pages.hasMore && <button className="primary-button" disabled={pages.loading} onClick={pages.loadMore}>{pages.loading ? 'Loading…' : 'Older updates'}</button>}<a className="text-link" href={`https://store.steampowered.com/news/app/${appID}`} target="_blank" rel="noreferrer">All updates on Steam</a></div>
  </section>;
}
