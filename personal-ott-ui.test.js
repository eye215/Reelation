import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('personal-ott.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const bootstrap=fs.readFileSync('bootstrap.js','utf8');
const v2=fs.readFileSync('reelation-v2.css','utf8');

test('personal OTT visual layer is mounted after legacy styles',()=>{
  assert.match(html,/reference-ott\.css\?v=mobile-ott-79/);
  assert.ok(html.indexOf('personal-ott.css')>html.indexOf('ott-ui.css'));
  assert.ok(html.indexOf('reference-ott.css')>html.indexOf('personal-ott.css'));
  assert.match(html,/reelation-v2\.css\?v=poster-motion-85/);
  assert.ok(html.indexOf('reelation-v2.css')>html.indexOf('reference-ott.css'));
  assert.match(html,/bootstrap\.js\?v=poster-motion-85/);
  assert.match(bootstrap,/app\.js\?v=poster-motion-85/);
});

test('movie description opens from the poster as an immersive modal',()=>{
  assert.match(app,/dialog class="r9-movie-modal"/);
  assert.match(app,/modal\.showModal\(\)/);
  assert.doesNotMatch(app,/section class="r9-about"/);
});

test('root entry collects birth data before guest or Kakao analysis',()=>{
  assert.match(app,/id="homeBirthForm"/);
  assert.match(app,/data-mode="guest">제출만 하기/);
  assert.match(app,/data-mode="kakao">카카오로 시작하기/);
  assert.doesNotMatch(app,/relation-home__preview/);
  assert.doesNotMatch(app,/relation-home__steps/);
});

test('poster lifts before the movie modal is revealed',()=>{
  assert.match(app,/classList\.add\('is-lifting'\)/);
  assert.match(app,/setTimeout\(resolve,260\)/);
  assert.match(app,/modal\.showModal\(\)/);
  assert.match(v2,/\.r9-poster\.is-lifting/);
  assert.match(v2,/prefers-reduced-motion:reduce/);
});

test('home and visitor experiences lead with full visual movie heroes',()=>{
  assert.match(app,/r10-entry-hero/);
  assert.match(app,/visitor-hero-poster/);
  assert.match(css,/min-height:100svh/);
  assert.match(css,/linear-gradient/);
});

test('cast and filmography use mobile horizontal rails',()=>{
  assert.match(css,/scroll-snap-type:x mandatory/);
  assert.match(css,/\.visitor-cast-card\{flex:0 0/);
  assert.match(css,/\.page:has\(>\.detail-hero\) \.film\{flex:0 0/);
});

test('rebuilt owner and cast detail are image-first mobile experiences',()=>{
  assert.match(app,/r9-poster/);
  assert.match(app,/r9-cast-lane/);
  assert.match(app,/r9-detail-visual/);
  assert.match(app,/r9-film-rail/);
  assert.match(v2,/scroll-snap-type:x mandatory/);
  assert.match(v2,/\.r9-poster\{position:relative;height:520px/);
});
