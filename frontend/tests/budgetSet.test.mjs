/*
 * Tests: budgetSet.test.mjs
 * Folder: frontend/tests
 * File: budgetSet.test.mjs
 * Purpose: Checks combined prices, money left, currency separation and
 *   removal of expired offers from the displayed set.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { budgetSetSummary } from '../js/budgetSet.js';

const now = 1800000000000;
const game = (amount, extra = {}) => ({ source:'steam', price:{ available:true, currency:'PHP', final:amount, checkedAt:now/1000, ...extra } });
test('one set reports its combined price, count and remaining budget in integer cents', () => {
  const result = { currency:'PHP', budgetCents:100000, games:[game(25000),game(35000),game(40000)], freeGames:[game(0)] };
  const before = structuredClone(result);
  const summary = budgetSetSummary(result, now);
  assert.equal(summary.totalCents,100000);
  assert.equal(summary.remainingCents,0);
  assert.equal(summary.gameCount,4);
  assert.equal(summary.expiredCount,0);
  assert.deepEqual(result,before);
});
test('expired and stale offers leave the visible set and its bottom total together', () => {
  const result = { currency:'PHP', budgetCents:100000, games:[game(25000),game(35000,{endsAt:now/1000+1}),game(40000,{stale:true})], freeGames:[] };
  assert.equal(budgetSetSummary(result,now).totalCents,60000);
  const later=budgetSetSummary(result,now+1100);
  assert.equal(later.totalCents,25000);
  assert.equal(later.gameCount,1);
  assert.equal(later.remainingCents,75000);
  assert.equal(later.expiredCount,2);
});
test('foreign prices, missing prices and old checks cannot enter a set total', () => {
  const summary = budgetSetSummary({currency:'PHP',budgetCents:100000,games:[game(25000),game(500,{currency:'USD'}),game(600,{checkedAt:now/1000-1800}),{source:'itch'},game(-1)],freeGames:[]},now);
  assert.equal(summary.totalCents,25000);
  assert.equal(summary.gameCount,1);
  assert.equal(summary.expiredCount,4);
});
test('Epic costs zero and disappears from the total and count at its claim deadline', () => {
  const offer={...game(0),source:'epic',endsAt:now/1000+1};
  const result={currency:'PHP',budgetCents:0,games:[],freeGames:[offer]};
  assert.equal(budgetSetSummary(result,now).gameCount,1);
  assert.equal(budgetSetSummary(result,now+1000).gameCount,0);
  assert.equal(budgetSetSummary(result,now+1000).remainingCents,0);
});
