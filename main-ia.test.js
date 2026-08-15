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
    'r9-share',
  ].map(token => app.indexOf(token));
  assert.ok(order.every(index => index >= 0));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
});

test('visitor participation is moved before public board and ranking', () => {
  assert.match(enhancements, /firstPublicSection\.before\(join\)/);
});

test('legacy relationship-map main is not mounted', () => {
  const enhancePipeline = enhancements.match(/const enhance=\(\)=>\{([^}]*)\}/)?.[1] ?? '';
  assert.doesNotMatch(enhancePipeline, /enhanceBoardMap/);
});
