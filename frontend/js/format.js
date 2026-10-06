export const number = value => new Intl.NumberFormat().format(value || 0);
export const compact = value => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
export const time = value => value ? new Date(value * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not updated yet';
export const date = value => value ? new Date(value * 1000).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown date';
export const timestamp = value => value ? new Date(value * 1000).toLocaleString() : 'Not updated yet';
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
