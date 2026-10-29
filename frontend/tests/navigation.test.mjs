/*
 * Tests: navigation.test.mjs
 * Folder: frontend/tests
 * File: navigation.test.mjs
 * Purpose: Checks browser route reading and writing.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readRoute, routeURL } from '../js/navigation.js';

const read = hash => { globalThis.window = { location: { hash } }; return readRoute(); };

test('genre links select a category and ignore library search and sorting', () => {
  const route = read('#/genres?genre=Action&q=another-game&sort=rating');
  assert.equal(route.genre, 'Action');
  assert.equal(route.search, '');
  assert.equal(route.sort, 'players');
  assert.equal(routeURL({ ...route, search: 'ignored', sort: 'rating' }), '#/genres?genre=Action');
  assert.equal(read('#/genres?browse=all').view, 'genres');
});

test('website updates ignore old game-feed filters and game dialogs', () => {
  const route = read('#/updates?filter=730&type=patch&game=730&genre=Action&q=game');
  assert.equal(route.view, 'updates');
  assert.equal(route.game, '');
  assert.equal(route.genre, '');
  assert.equal(routeURL({ ...route, game: '730', feedGame: '730', updateType: 'patch' }), '#/updates');
});

test('All Games keeps its search, genre and sort choices when opening game details', () => {
  const route = read('#/all-games?genre=Free+to+Play&q=Counter&sort=rating&game=730&tab=reviews');
  assert.equal(route.search, 'Counter');
  assert.equal(route.genre, 'Free to Play');
  assert.equal(route.sort, 'rating');
  assert.equal(route.game, '730');
  assert.deepEqual(read(routeURL(route)), route);
});

test('budget choices are not read from or serialized into the route', () => {
  const route = read('#/budget?budget=500&rating=80&genre=Action&q=private-choice');
  assert.equal(route.view, 'budget');
  assert.equal(route.genre, '');
  assert.equal(route.search, '');
  assert.equal(routeURL({ ...route, budget: '500', rating: 80, genre: 'Action', search: 'private-choice' }), '#/budget');
});

test('platform selections survive links and cannot open unrelated Steam dialogs', () => {
  for (const platform of ['epic', 'itch']) {
    const route = read(`#/all-games?platform=${platform}&game=730&tab=reviews`);
    assert.equal(route.view, 'all-games');
    assert.equal(route.platform, platform);
    assert.equal(route.game, '');
    assert.equal(routeURL({ ...route, game: '730' }), `#/all-games?platform=${platform}`);
    assert.equal(read(`#/${platform}`).platform, platform);
  }
});

test('genres and discounts keep platform choices separate from library filters', () => {
  const route = read('#/genres?platform=itch&genre=Survival&q=ignored&sort=rating');
  assert.equal(route.search, '');
  assert.equal(routeURL(route), '#/genres?platform=itch&genre=Survival');
  const discounts = read('#/discounts?platform=epic&budget=500&genre=Action');
  assert.equal(discounts.genre, '');
  assert.equal(routeURL(discounts), '#/discounts?platform=epic');
  assert.equal(read('#/all-games?platform=unknown').platform, 'steam');
});
