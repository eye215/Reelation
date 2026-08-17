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
  assert.match(html,/reelation-v2\.css\?v=top-cast-100/);
  assert.ok(html.indexOf('reelation-v2.css')>html.indexOf('reference-ott.css'));
  assert.match(html,/bootstrap\.js\?v=top-cast-100/);
  assert.match(bootstrap,/app\.js\?v=top-cast-100/);
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
  assert.match(app,/r12-visitor-poster/);
  assert.match(css,/min-height:100svh/);
  assert.match(css,/linear-gradient/);
});

test('invite visitors see the movie first and authenticate only to participate',()=>{
  assert.match(app,/function visitorPageV2/);
  assert.match(app,/id="visitorJoinOpen"/);
  assert.match(app,/id="visitorKakao"/);
  assert.match(app,/id="visitorMagicForm"/);
  assert.match(app,/state\.authUserId\?/);
  assert.match(app,/isVisitor=Boolean\(getPublicId\(location\.pathname\)\)/);
});

test('returning Kakao sessions restore saved birth profile without re-entry',()=>{
  assert.match(bootstrap,/ownerProfile/);
  assert.match(bootstrap,/from\('birth_profiles'\)/);
  assert.match(app,/userId&&board&&ownerProfile/);
  assert.match(app,/history\.replaceState\(\{\},'','\/board'\)/);
});

test('cast and filmography use mobile horizontal rails',()=>{
  assert.match(css,/scroll-snap-type:x mandatory/);
  assert.match(css,/\.visitor-cast-card\{flex:0 0/);
  assert.match(css,/\.page:has\(>\.detail-hero\) \.film\{flex:0 0/);
});

test('rebuilt owner and cast detail are image-first mobile experiences',()=>{
  assert.match(app,/r9-poster/);
  assert.match(app,/r11-cast-board/);
  assert.match(app,/data-cast-preview/);
  assert.match(app,/r9-detail-visual/);
  assert.match(app,/r9-film-rail/);
  assert.match(v2,/scroll-snap-type:x mandatory/);
  assert.match(v2,/\.r9-poster\{position:relative;height:520px/);
});

test('owner root restores the movie home instead of repeating onboarding',()=>{
  assert.match(app,/else if\(p==='\/'\)state\.onboarded\?board\(\):homePage\(\)/);
});

test('cast navigation is a grouped character explorer distinct from ranking',()=>{
  const castList=app.slice(app.indexOf('function castList()'),app.indexOf('function add()'));
  assert.match(castList,/r13-cast-page/);
  assert.match(castList,/LEAD CAST/);
  assert.match(castList,/SUPPORTING CAST/);
  assert.match(castList,/FEATURED · CAMEO/);
  assert.doesNotMatch(castList,/rankList\(/);
  assert.match(v2,/\.r13-cast-rail/);
});

test('owner navigation names match the separated information architecture',()=>{
  assert.match(app,/>영화<\/button>/);
  assert.match(app,/>출연진<\/button>/);
  assert.match(app,/>영향도<\/button>/);
});

test('ranking is presented as a Top Cast experience instead of a legacy report',()=>{
  const ranking=app.slice(app.indexOf('function ranking()'),app.indexOf('function genre('));
  assert.match(ranking,/r14-ranking/);
  assert.match(ranking,/TOP CAST/);
  assert.match(ranking,/친구 초대하기/);
  assert.doesNotMatch(ranking,/The leaderboard/);
  assert.match(v2,/\.r14-rank-row/);
});

test('MY is an account and privacy hub instead of the legacy demo card',()=>{
  assert.match(app,/function settings\(\)\{/);
  assert.match(app,/내 Reelation/);
  assert.match(app,/원본 생년월일과 출생시간은 관계 분석에만 사용/);
  assert.match(app,/이 기기의 임시 데이터 지우기/);
  assert.doesNotMatch(app,/데모 초기화/);
  assert.match(html,/my-page\.css\?v=my-hub-101/);
});

test('invite management supports copy, native share, privacy and server-facing status',()=>{
  const invite=app.slice(app.indexOf('function invite()'),app.indexOf('function settings()'));
  assert.match(invite,/r16-invite-page/);
  assert.match(invite,/navigator\.clipboard\.writeText/);
  assert.match(invite,/navigator\.share/);
  assert.match(invite,/원본 정보는/);
  assert.match(invite,/state\.invite=!state\.invite/);
  assert.match(html,/invite-page\.css\?v=invite-hub-102/);
});

test('new invite UI is connected to opaque server tokens and server-side disable',()=>{
  const integration=fs.readFileSync(new URL('./invite-integration.js',import.meta.url),'utf8');
  assert.match(integration,/\.r16-link-card, \.invite-card/);
  assert.match(integration,/functions\.invoke\('create-invite'/);
  assert.match(integration,/update\(\{invite_enabled:false\}\)/);
  assert.match(integration,/update\(\{invite_enabled:true\}\)/);
  assert.match(integration,/update\(\{status:'DISABLED'\}\)/);
  assert.match(integration,/sessionStorage\.removeItem\(`reelation-owner-invite:/);
});
