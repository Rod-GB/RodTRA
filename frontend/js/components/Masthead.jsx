import React from 'react';
import Icon from './Icon';

export default function Masthead({ status, cached, menuOpen, onMenu, view }) {
  return <header className="masthead">
    <button className="menu-toggle icon-button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="sidebar" onClick={onMenu}><Icon name={menuOpen ? 'close' : 'menu'}/></button>
    <a className="brand" href="#/dashboard" aria-label="Gdaw home"><span className="brand-mark" aria-hidden="true"><img src="/favicon.svg?v=gdaw-centered-3" alt=""/></span><span>Gdaw<span className="brand-period">.</span></span></a>
    <nav className="main-nav" aria-label="Main navigation"><a href="#/dashboard" aria-current={view !== 'updates' ? 'page' : undefined}>Homepage</a><a href="#/updates" aria-current={view === 'updates' ? 'page' : undefined}>Updates</a></nav>
    <span className="edition"><span className={`status-dot ${cached ? 'cached' : ''}`}/>Steam <span>{status}</span></span>
  </header>;
}
