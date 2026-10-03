import React from 'react';

export default function Masthead({ view, onView, status, cached }) {
  return <header className="masthead">
    <a className="brand" href="/" aria-label="RodTRA home"><span className="brand-mark" aria-hidden="true">R</span><span>RodTRA</span></a>
    <nav className="main-nav" aria-label="Main views">{['Games', 'Genres', 'Patches'].map(label =>
      <button key={label} aria-pressed={view === label.toLowerCase()} onClick={() => onView(label.toLowerCase())}>{label}</button>)}</nav>
    <span className="edition"><span className={`status-dot ${cached ? 'cached' : ''}`}/>{status}</span>
  </header>;
}
