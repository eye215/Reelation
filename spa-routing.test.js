import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const fallback=fs.readFileSync('404.html','utf8');
const bootstrap=fs.readFileSync('bootstrap.js','utf8');

test('GitHub Pages deep links recover the original SPA route',()=>{
  assert.match(fallback,/reelation-spa-path/);
  assert.match(fallback,/location\.pathname\+location\.search\+location\.hash/);
  assert.match(bootstrap,/history\.replaceState\(\{\},'',recoveredPath\)/);
  assert.match(bootstrap,/sessionStorage\.removeItem\('reelation-spa-path'\)/);
});
