/*
 * Component: Sidebar
 * Folder: frontend/js/components
 * File: Sidebar.jsx
 * Purpose: Draws the side navigation and manages its mouse, keyboard and
 *   touch feedback.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon';

const items = [['dashboard', 'Dashboard', 'dashboard'], ['all-games', 'All Games', 'library'], ['genres', 'Genres', 'genres'], ['most-played', 'Most Played', 'trophy'], ['discounts', 'Discount/Price', 'library'], ['budget', 'Budget Finder', 'search']];
const motionMilliseconds = 1000;
const exitMilliseconds = 800;
const mouseCanHover = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export default function Sidebar({ view, open, onNavigate }) {
  const sidebar = useRef(null);
  const [feedback, setFeedback] = useState({});
  const phases = useRef({});
  const resetTimers = useRef(new Map());
  const touch = useRef(null);
  const lastPointer = useRef('mouse'), navigationTimer = useRef(null);

  const setPhase = useCallback((key, phase) => {
    clearTimeout(resetTimers.current.get(key));
    resetTimers.current.delete(key);
    if (phases.current[key] === phase) return;
    phases.current = { ...phases.current, [key]: phase };
    setFeedback(phases.current);
  }, []);

  const finishFeedback = useCallback(key => {
    if (phases.current[key] !== 'enter') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase(key, 'idle');
      return;
    }
    setPhase(key, 'exit');
    // Also clear if a browser interrupts the CSS transition, such as for a long-press menu.
    resetTimers.current.set(key, setTimeout(() => setPhase(key, 'idle'), exitMilliseconds + 80));
  }, [setPhase]);

  const releaseTouch = useCallback(event => {
    if (!touch.current) return;
    if (event?.type === 'pointerup' && event.pointerId !== touch.current.id) return;
    const key = touch.current.key;
    touch.current = null;
    finishFeedback(key);
  }, [finishFeedback]);

  const resetFeedback = useCallback(() => {
    touch.current = null;
    for (const timer of resetTimers.current.values()) clearTimeout(timer);
    resetTimers.current.clear();
    phases.current = {};
    setFeedback({});
  }, []);

  useEffect(() => {
    const hideFeedback = () => { if (document.hidden) resetFeedback(); };
    const pressElsewhere = event => {
      if (touch.current && !touch.current.element.contains(event.target)) releaseTouch();
    };
    const hover = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    document.addEventListener('pointerdown', pressElsewhere, true);
    for (const name of ['pointerup', 'pointercancel', 'scroll'])
      document.addEventListener(name, releaseTouch, true);
    document.addEventListener('visibilitychange', hideFeedback);
    window.addEventListener('blur', resetFeedback);
    hover.addEventListener('change', resetFeedback);
    reducedMotion.addEventListener('change', resetFeedback);
    const timers = resetTimers.current;
    return () => {
      document.removeEventListener('pointerdown', pressElsewhere, true);
      for (const name of ['pointerup', 'pointercancel', 'scroll'])
        document.removeEventListener(name, releaseTouch, true);
      document.removeEventListener('visibilitychange', hideFeedback);
      window.removeEventListener('blur', resetFeedback);
      hover.removeEventListener('change', resetFeedback);
      reducedMotion.removeEventListener('change', resetFeedback);
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      clearTimeout(navigationTimer.current);
    };
  }, [releaseTouch, resetFeedback]);

  useEffect(() => { if (!open) { resetFeedback(); clearTimeout(navigationTimer.current); } }, [open, resetFeedback]);

  const beginTouch = (event, key) => {
    lastPointer.current = event.pointerType;
    if (event.pointerType === 'mouse') return;
    releaseTouch();
    if (!event.isPrimary) return;
    touch.current = { key, id: event.pointerId, element: event.currentTarget, x: event.clientX, y: event.clientY };
    setPhase(key, 'enter');
  };
  const moveTouch = event => {
    const pressed = touch.current;
    if (!pressed || pressed.id !== event.pointerId) return;
    const bounds = pressed.element.getBoundingClientRect();
    if (Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) > 24 ||
        event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) releaseTouch();
  };
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
  return <aside id="sidebar" ref={sidebar} className={`sidebar ${open ? 'is-open' : ''}`} style={{ '--sidebar-motion-duration': `${motionMilliseconds}ms` }}>
    <p className="sidebar-caption">Explore</p>
    <nav aria-label="Homepage sections">{items.map(([value, label, icon]) => <a key={value} href={`#/${value}`} className={`sidebar-link ${view === value ? 'is-active' : ''}`} data-feedback={feedback[value] || 'idle'} aria-current={view === value ? 'page' : undefined}
      onContextMenu={event => { if (touch.current?.key === value) event.preventDefault(); }}
      onClick={event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        if (open && lastPointer.current !== 'mouse' && event.detail !== 0) {
          event.preventDefault(); releaseTouch(); clearTimeout(navigationTimer.current);
          navigationTimer.current = setTimeout(() => { window.location.hash = `#/${value}`; onNavigate(); }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : exitMilliseconds);
        } else onNavigate();
      }}
      onPointerEnter={event => { if (event.pointerType === 'mouse' && mouseCanHover()) setPhase(value, 'enter'); }}
      onPointerLeave={event => {
        if (event.pointerType === 'mouse') {
          if (!event.currentTarget.matches(':focus-visible')) finishFeedback(value);
        } else if (touch.current?.key === value) releaseTouch();
      }}
      onPointerDown={event => beginTouch(event, value)} onPointerMove={moveTouch}
      onFocus={event => { if (event.currentTarget.matches(':focus-visible')) setPhase(value, 'enter'); }}
      onBlur={event => { if (!(mouseCanHover() && event.currentTarget.matches(':hover'))) finishFeedback(value); }}
      onTransitionEnd={event => {
        if (event.target === event.currentTarget && event.propertyName === 'clip-path' && phases.current[value] === 'exit') setPhase(value, 'idle');
      }}>
      <Icon name={icon}/><span>{label}</span><Icon name="arrow" className="nav-arrow"/>
    </a>)}</nav>
    <div className="sidebar-bottom"><span className="sidebar-emblem" aria-hidden="true"><img src="/images/gdaw-head.png" width="64" height="64" alt=""/></span><p>Steam. Epic.<br/><strong>itch.io.</strong></p></div>
  </aside>;
}
