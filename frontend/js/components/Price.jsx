import React from 'react';
import { money, timestamp } from '../format';

export default function Price({ price, detailed = false }) {
  if (!price?.available) return <span className="game-price price-missing">Price unavailable</span>;
  return <span className={`game-price ${price.stale ? 'price-stale' : ''}`}>
    {price.discount > 0 && <><span className="discount-badge">−{price.discount}%</span><del aria-label={`Original price ${money(price.original, price.currency)}`}>{money(price.original, price.currency)}</del></>}
    <strong>{price.free ? price.freeLabel || 'Free to play' : money(price.final, price.currency)}</strong>
    {price.stale && <small>Saved price · Verify on the store</small>}
    {detailed && <small>Philippines store · {price.checkedAt ? `Checked ${timestamp(price.checkedAt)}` : 'Waiting for price information'}</small>}
  </span>;
}
