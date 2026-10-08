import React from 'react';

const paths = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  genres: <><path d="M3 7h7l2-3h9v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M3 11h18"/></>,
  trophy: <><path d="M8 3h8v6a4 4 0 0 1-8 0Z"/><path d="M8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 1v6m-4 2h8m-6-2h4"/></>,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>,
  shuffle: <path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c5 0 7-12 12-12h3m-4-4 4 4-4 4"/>,
  players: <><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m3 10v-3a6 6 0 0 0-2-4"/></>,
  search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  library: <><path d="M4 4h5v16H4zm8 0h5v16h-5zm8 1 2 14"/><path d="M4 8h5m3 0h5"/></>,
  updates: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 12h8M8 17h5"/></>,
};
export default function Icon({ name, ...props }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.arrow}</svg>;
}
