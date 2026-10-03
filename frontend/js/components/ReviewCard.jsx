import React from 'react';
import { number, date } from '../format';

export default function ReviewCard({ review, appID }) {
  const profile = `https://steamcommunity.com/profiles/${encodeURIComponent(review.steamID)}`;
  return <article className="review-card">
    <div className="review-top"><span className={`recommendation ${review.recommended ? 'positive' : 'negative'}`}>{review.recommended ? 'Recommended' : 'Not recommended'}</span><time dateTime={new Date(review.time * 1000).toISOString()}>{date(review.time)}</time></div>
    <p className="review-text">{review.text}</p>
    <div className="review-bottom"><a href={profile} target="_blank" rel="noreferrer">Steam player · {review.steamID.slice(-6)}</a><span>{(review.minutesPlayed / 60).toFixed(1)} hours at review</span><a href={`${profile}/recommended/${appID}/`} target="_blank" rel="noreferrer">View on Steam</a></div>
    {!!review.helpfulVotes && <p className="helpful">{number(review.helpfulVotes)} found this helpful</p>}
  </article>;
}
