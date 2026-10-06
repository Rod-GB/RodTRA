import React, { useEffect, useRef } from 'react';
import Icon from './Icon';

const items = [['dashboard', 'Dashboard', 'dashboard'], ['genres', 'Genres', 'genres'], ['most-played', 'Most Played', 'trophy']];

export default function Sidebar({ view, open, onNavigate }) {
  const sidebar = useRef(null);
  useEffect(() => {
    if (!open) return;
    sidebar.current?.querySelector('a')?.focus();
    const handleKey = event => {
      if (event.key === 'Escape') { onNavigate(); document.querySelector('.menu-toggle')?.focus(); }
      if (event.key === 'Tab') {
        const targets = [document.querySelector('.menu-toggle'), ...sidebar.current.querySelectorAll('a')].filter(Boolean);
        const index = targets.indexOf(document.activeElement);
        event.preventDefault();
        targets[(index + (event.shiftKey ? -1 : 1) + targets.length) % targets.length]?.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);
  return <aside id="sidebar" ref={sidebar} className={`sidebar ${open ? 'is-open' : ''}`}>
    <p className="sidebar-caption">Explore</p>
    <nav aria-label="Homepage sections">{items.map(([value, label, icon]) => <a key={value} href={`#/${value}`} className={`sidebar-link ${view === value ? 'is-active' : ''}`} aria-current={view === value ? 'page' : undefined} onClick={onNavigate}>
      <Icon name={icon}/><span>{label}</span><Icon name="arrow" className="nav-arrow"/>
    </a>)}</nav>
    <div className="sidebar-bottom"><span className="sidebar-emblem" aria-hidden="true">G</span><p>Your next<br/><strong>great game.</strong></p><span className="small muted">Discover. Explore. Play.</span></div>
  </aside>;
}
