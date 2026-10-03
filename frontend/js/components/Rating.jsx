import React from 'react';
import { number, percent, ratingClass } from '../format';

export default function Rating({ game }) {
  const score = percent(game);
  return <span className={`rating ${ratingClass(game)}`} title={score === null ? 'No rating available yet' : `${number(game.positiveReviews)} positive of ${number(game.totalReviews)} reviews`}>
    {score === null ? 'Unavailable' : `${score.toFixed(1)}%`}<span>{game.rating || 'No rating yet'}</span>
  </span>;
}
