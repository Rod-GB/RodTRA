import React, { useState } from 'react';
import ReviewCard from './ReviewCard';
import Rating from './Rating';
import { number, timestamp } from '../format';
import { useSteamPages } from '../useSteamPages';

export default function ReviewsSection({ game }) {
  const [sort, setSort] = useState('recent');
  const pages = useSteamPages('reviews', game.appID, sort);
  const reviews = pages.items.length ? pages.items : sort === 'recent' ? game.reviews : [];
  return <section className="reviews-section" aria-label="Player reviews">
    <div className="reviews-heading"><div><h3>Player reviews</h3><p className="small muted">English reviews · Overall rating: all languages.</p></div><Rating game={game}/></div>
    <div className="content-controls"><label>Order <select value={sort} onChange={event => setSort(event.target.value)}><option value="recent">Newest</option><option value="helpful">Most helpful</option></select></label><button className="quiet-button" disabled={pages.loading} onClick={pages.refresh}>Refresh reviews</button><span className="small muted">{number(game.totalReviews)} total</span></div>
    <p className="small muted">{pages.updatedAt ? `Fetched: ${timestamp(pages.updatedAt)}` : game.reviewsUpdatedAt ? `Saved rating: ${timestamp(game.reviewsUpdatedAt)}` : 'Getting Steam reviews…'}</p>
    {pages.error && <p className="notice" role="alert">{pages.error} <button className="quiet-button" disabled={pages.loading} onClick={pages.items.length ? pages.loadMore : pages.refresh}>Retry</button></p>}
    {pages.message && <p className="notice" role="status">{pages.message}</p>}
    {reviews.length ? <div className="review-list">{reviews.map(review => <ReviewCard key={review.id} review={review} appID={game.appID}/>)}</div> : <p className="empty-reviews">{pages.loading ? 'Loading reviews…' : pages.error ? 'Reviews could not be loaded.' : 'No English reviews available.'}</p>}
    <div className="browse-actions">{pages.hasMore && <button className="primary-button" disabled={pages.loading} onClick={pages.loadMore}>{pages.loading ? 'Loading…' : 'Load more reviews'}</button>}<a className="text-link" href={`https://steamcommunity.com/app/${game.appID}/reviews/`} target="_blank" rel="noreferrer">All reviews on Steam</a></div>
  </section>;
}
