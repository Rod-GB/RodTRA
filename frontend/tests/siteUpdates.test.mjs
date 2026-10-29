/*
 * Tests: siteUpdates.test.mjs
 * Folder: frontend/tests
 * File: siteUpdates.test.mjs
 * Purpose: Checks website changelog parsing and expected update content.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseWebsiteUpdates } from '../js/siteUpdates.js';

test('website release notes preserve dates, changes and newest-first order', () => {
  const notes = '# Website updates\r\n## 2026-10-08 | Earlier release\r\n- First change\r\n## 2026-10-12 | New release\r\n### Fixes\r\n- A website fix\r\n- Another fix';
  const updates = parseWebsiteUpdates(notes);
  assert.deepEqual(updates.map(update => update.date), ['2026-10-12', '2026-10-08']);
  assert.equal(updates[0].title, 'New release');
  assert.deepEqual(updates[0].groups, [{ title: 'Fixes', items: ['A website fix', 'Another fix'] }]);
  assert.deepEqual(updates[1].groups, [{ title: 'Changes', items: ['First change'] }]);
});

test('the bundled changelog contains the requested website and genre corrections', async () => {
  const notes = await readFile(new URL('../../CHANGELOG.md', import.meta.url), 'utf8');
  const updates = parseWebsiteUpdates(notes);
  assert.equal(updates[0].date, '2026-10-29');
  assert.equal(updates.length, (notes.match(/^## /gm) || []).length);
  const changes = updates.find(update => update.date === '2026-10-12').groups.flatMap(group => group.items).join(' ');
  assert.match(changes, /Gdaw website/);
  assert.match(changes, /only its games/);
  assert.match(changes, /Removed the search bar and dropdowns/);
});
