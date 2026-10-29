/*
 * Module: format.js
 * Folder: frontend/js
 * File: format.js
 * Purpose: Keeps common number, date, money, rating and image formatting
 *   consistent.
 */

export const number = value => new Intl.NumberFormat().format(value || 0);
export const compact = value => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
export const time = value => value ? new Date(value * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not updated yet';
export const date = value => value ? new Date(value * 1000).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown date';
export const timestamp = value => value ? new Date(value * 1000).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Not updated yet';
export const percent = game => game.totalReviews ? 100 * game.positiveReviews / game.totalReviews : null;
export const ratingClass = game => percent(game) === null ? 'muted' : percent(game) >= 70 ? 'positive' : percent(game) >= 40 ? 'mixed' : 'negative';

// Steam descriptions sometimes contain HTML entities. Display plain text.
export function plainText(text) {
  return new DOMParser().parseFromString(text || '', 'text/html').body.textContent || '';
}

export function steamImage(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && /(^|\.)(steamstatic\.com|akamaihd\.net)$/.test(parsed.hostname) ? url : '';
  } catch { return ''; }
}

export function gameImage(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && /(^|\.)(steamstatic\.com|akamaihd\.net|itch\.zone|epicgames\.com|unrealengine\.com)$/.test(parsed.hostname) ? parsed.href : '';
  } catch { return ''; }
}

export const money = (cents, currency = 'PHP') => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);
