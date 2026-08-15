import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('personal-ott.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const bootstrap=fs.readFileSync('bootstrap.js','utf8');

test('personal OTT visual layer is mounted after legacy styles',()=>{
  assert.match(html,/personal-ott\.css\?v=layout-repair-77/);
  assert.ok(html.indexOf('personal-ott.css')>html.indexOf('ott-ui.css'));
  assert.match(html,/bootstrap\.js\?v=layout-repair-77/);
  assert.match(bootstrap,/app\.js\?v=layout-repair-77/);
});

test('home and visitor experiences lead with full visual movie heroes',()=>{
  assert.match(app,/relation-home__hero-still/);
  assert.match(app,/visitor-hero-poster/);
  assert.match(css,/min-height:100svh/);
  assert.match(css,/linear-gradient/);
});

test('cast and filmography use mobile horizontal rails',()=>{
  assert.match(css,/scroll-snap-type:x mandatory/);
  assert.match(css,/\.visitor-cast-card\{flex:0 0/);
  assert.match(css,/\.page:has\(>\.detail-hero\) \.film\{flex:0 0/);
});
