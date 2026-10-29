/*
 * Module: gameInfo.js
 * Folder: frontend/js
 * File: gameInfo.js
 * Purpose: Chooses a suitable available post for the Latest update field.
 */

// Prefer a game update; fall back to an honestly labeled developer announcement.
export function latestDeveloperPost(posts = []) {
  const valid = posts.filter(post => /^https:\/\//.test(post.url || '')).sort((a, b) =>
    (b.time || Date.parse(b.date || '') / 1000 || 0) - (a.time || Date.parse(a.date || '') / 1000 || 0));
  return valid.find(post => post.patch || post.kind === 'Developer update' ||
    /\b(patch|hotfix|update|version)\b/i.test(`${post.category || ''} ${post.title || ''}`) && !/\b(event|trailer|sale|AMA)\b/i.test(post.title || '')) || valid[0] || null;
}
