import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const enhancements = readFileSync(new URL('./ui-enhancements.js', import.meta.url), 'utf8');

test('owner main follows the agreed movie IA', () => {
  const order = [
    'r9-poster',
    'r9-casting',
    'r9-topcast',
  ].map(token => app.indexOf(token));
  assert.ok(order.every(index => index >= 0));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
});

test('owner board removes duplicate invite and ranking content', () => {
  const board = app.slice(app.indexOf('function board()'), app.indexOf('function rankList'));
  assert.equal((board.match(/data-go="\/invite"/g) ?? []).length, 1);
  assert.match(board, /ranked\.slice\(0,3\)/);
  assert.doesNotMatch(board, /class="r9-share"/);
  assert.doesNotMatch(board, />공유<\/button>/);
});

test('visitor participation is moved before public board and ranking', () => {
  assert.match(enhancements, /firstPublicSection\.before\(join\)/);
});

test('legacy relationship-map main is not mounted', () => {
  const enhancePipeline = enhancements.match(/const enhance=\(\)=>\{([^}]*)\}/)?.[1] ?? '';
  assert.doesNotMatch(enhancePipeline, /enhanceBoardMap/);
});
