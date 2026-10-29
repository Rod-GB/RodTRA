/*
 * Tests: gameInfo.test.mjs
 * Folder: frontend/tests
 * File: gameInfo.test.mjs
 * Purpose: Checks how the latest available developer post is selected.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { latestDeveloperPost } from '../js/gameInfo.js';

test('metadata finds an untagged update while keeping a newer event as an announcement', () => {
  const update = { title: 'Apex Legends: Latest Update', patch: false, time: 100, url: 'https://steamcommunity.com/games/1172470/announcements/detail/123' };
  const event = { title: 'Blood Pact Event', patch: false, time: 200, url: 'https://steamcommunity.com/games/1172470/announcements/detail/456' };
  assert.equal(latestDeveloperPost([event, update]), update);
  assert.equal(latestDeveloperPost([event]), event);
});

test('metadata orders devlogs by date, handles empty feeds, and refuses unsafe links', () => {
  const older = { title: 'Patch 1', date: '2026-10-01', url: 'https://creator.itch.io/game/devlog/1/patch' };
  const newer = { title: 'Version 2', date: '2026-10-14', url: 'https://creator.itch.io/game/devlog/2/version' };
  assert.equal(latestDeveloperPost([older, newer]), newer);
  assert.equal(latestDeveloperPost([]), null);
  assert.equal(latestDeveloperPost([{ title: 'Patch', url: 'javascript:alert(1)' }]), null);
});
