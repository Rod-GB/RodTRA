/*
 * Component: Masthead
 * Folder: frontend/js/components
 * File: Masthead.jsx
 * Purpose: Draws the top logo, Homepage and Updates links, data status and
 *   mobile menu button.
 */

import React from 'react';
import Icon from './Icon';

export default function Masthead({ status, cached, menuOpen, onMenu, view }) {
  return <header className="masthead">
    <button className="menu-toggle icon-button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="sidebar" onClick={onMenu}><Icon name={menuOpen ? 'close' : 'menu'}/></button>
    <a className="brand" href="#/dashboard" aria-label="Gdaw home"><span className="brand-mark" aria-hidden="true"><img src="/images/gdaw-logo.png" width="128" height="184" alt=""/></span><span>Gdaw<span className="brand-period">.</span></span></a>
    <nav className="main-nav" aria-label="Main navigation"><a href="#/dashboard" aria-current={view !== 'updates' ? 'page' : undefined}>Homepage</a><a href="#/updates" aria-current={view === 'updates' ? 'page' : undefined}>Updates</a></nav>
    {view === 'updates' ? <span className="edition">Website updates</span> : <span className="edition"><span className={`status-dot ${cached ? 'cached' : ''}`}/><span>{status === 'Store listings' ? 'Game data' : status}</span></span>}
  </header>;
}
