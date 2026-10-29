/*
 * Component: LoadingCards
 * Folder: frontend/js/components
 * File: LoadingCards.jsx
 * Purpose: Shows temporary placeholder cards while Steam data is loading.
 */

import React from 'react';

export default function LoadingCards() {
  return <div className="game-grid skeleton-grid" role="status"><span className="sr-only">Loading Steam games…</span>{Array.from({ length: 8 }, (_, index) => <div className="skeleton-card" key={index} aria-hidden="true"><div className="skeleton-art"/><div className="skeleton-line"/><div className="skeleton-line short"/><div className="skeleton-line"/></div>)}</div>;
}