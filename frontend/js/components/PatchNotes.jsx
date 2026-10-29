/*
 * Component: PatchNotes
 * Folder: frontend/js/components
 * File: PatchNotes.jsx
 * Purpose: Builds the Steam Patches and updates section.
 */

import React from 'react';
import { timestamp } from '../format';
import PatchArticle from './PatchArticle';
export { patchText } from '../patchText';

export default function PatchNotes({ pages }) {
  return <section className="patches-section" aria-label="Steam patch notes and updates">
    <div className="reviews-heading"><div><h3>Patches & updates</h3><p className="small muted">News and updates from the developer.</p></div><button className="secondary-button" disabled={pages.loading} onClick={pages.refresh}>Refresh</button></div>
    {pages.updatedAt > 0 && <p className="small muted">Updated {timestamp(pages.updatedAt)}</p>}
    {pages.message && <p className="notice" role="status">{pages.message}</p>}
    {pages.error && <p className="notice" role="alert">{pages.error} <button className="quiet-button" disabled={pages.loading} onClick={pages.refresh}>Retry</button></p>}
    <div className="patch-list">{pages.items.map((post, index) => <PatchArticle key={post.id} post={post} expanded={index === 0}/>)}</div>
    {!pages.items.length && <p className="empty-reviews">{pages.loading ? 'Loading Steam updates…' : pages.error ? 'Updates could not be loaded.' : 'No updates listed.'}</p>}
    <div className="browse-actions">{pages.hasMore && <button className="secondary-button" disabled={pages.loading} onClick={pages.loadMore}>{pages.loading ? 'Loading…' : 'Older updates'}</button>}</div>
  </section>;
}
