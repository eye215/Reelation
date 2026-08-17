import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const inviteClient = readFileSync(new URL('./invite-integration.js', import.meta.url), 'utf8');
const schema = readFileSync(
  new URL('./supabase/migrations/20260815024000_initial_reelation_schema.sql', import.meta.url),
  'utf8',
);

test('invite schema stores token_hash instead of a raw token column', () => {
  const inviteTable = schema.match(/create table public\.invites \(([\s\S]*?)\n\);/)?.[1] ?? '';
  assert.match(inviteTable, /token_hash text not null unique/);
  assert.doesNotMatch(inviteTable, /(^|\n)\s*token\s+text\b/);
});

test('participant birth data is not directly selectable by an owner through RLS', () => {
  assert.match(schema, /c\.source_type='MANUAL'/);
  assert.doesNotMatch(schema, /c\.source_type='INVITE'.*birth_profiles/s);
  assert.match(schema, /revoke all on public\.saju_profiles,public\.invite_participations from anon,authenticated/);
});

test('ordinary client inserts cannot forge INVITE cast members', () => {
  assert.match(schema, /casts_owner_insert[\s\S]*source_type='MANUAL'/);
});

test('invite client resolves opaque tokens and submits through server functions', () => {
  assert.match(inviteClient, /invokePublicFunction\('resolve-invite'/);
  assert.match(inviteClient, /functions\.invoke\('submit-invite-auth'/);
  assert.match(inviteClient, /\^\\\/reel\\\/\(\[A-Za-z0-9_-\]\{40,128\}\)/);
});

test('public invite resolution avoids unsupported authorization preflight',()=>{
  const client=readFileSync(new URL('./supabase-client.js',import.meta.url),'utf8');
  const resolver=readFileSync(new URL('./supabase/functions/resolve-invite/index.ts',import.meta.url),'utf8');
  assert.match(client,/invokePublicFunction/);
  assert.match(client,/headers:\{apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application\/json'\}/);
  assert.match(resolver,/authorization,apikey,content-type/);
  const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
  assert.match(inviteClient,/supabase-client\.js\?v=public-invite-103/);
  assert.match(html,/invite-integration\.js\?v=invite-retry-111/);
});

test('current visitor V2 form is bound to the authenticated server transaction', () => {
  assert.match(app, /id="visitorJoinForm"/);
  assert.match(inviteClient, /#visitorJoinForm, #visitorForm/);
  assert.match(inviteClient, /#visitorJoinUnknown/);
  assert.match(inviteClient, /data\.participationId/);
  assert.match(inviteClient, /form\.dataset\.castMemberId=data\.castMemberId/);
});

test('valid invite routes directly to the movie main before authentication', () => {
  assert.match(inviteClient, /reelation-valid-invite/);
  assert.match(inviteClient, /Authentication is[\s\S]*deferred/);
  assert.doesNotMatch(inviteClient, /id="enterInvite"/);
});

test('invite client maps server rejection codes to safe user-facing states', () => {
  for (const code of ['INVALID_TOKEN','INVITE_NOT_FOUND','INVITE_DISABLED','INVITE_EXPIRED','DUPLICATE_PARTICIPATION','INVALID_BIRTH_DATE','INVALID_BIRTH_TIME']) {
    assert.match(inviteClient, new RegExp(code));
  }
  assert.match(inviteClient, /error\?\.context\?\.clone\?\.\(\)\.json/);
});

test('transient invite lookup failures retry without pretending the invite expired',()=>{
  assert.match(inviteClient,/resolveInviteWithRetry/);
  assert.match(inviteClient,/attempts=3/);
  assert.match(inviteClient,/SERVER_UNAVAILABLE:'초대 정보를 잠시 불러오지 못했어요.'/);
  assert.match(inviteClient,/네트워크 연결을 확인한 뒤 다시 시도해주세요/);
  assert.match(inviteClient,/다시 시도/);
});

test('cached invites are revalidated and disabled access is cleared', () => {
  assert.doesNotMatch(inviteClient, /valid-invite'\)===token\)return/);
  assert.match(inviteClient, /removeItem\('reelation-valid-invite'\)/);
  assert.match(inviteClient, /reelation-invite-resolved/);
  assert.match(app, /addEventListener\('reelation-invite-resolved'/);
});

test('owner exposes only a server-validated invite URL',()=>{
  assert.match(app,/안전한 초대 링크 준비 중/);
  assert.match(app,/id="copy" disabled/);
  assert.match(inviteClient,/isServerInviteValid/);
  assert.match(inviteClient,/tokenFromUrl/);
});

test('visitor participation preserves the visitor owner state and never fabricates a client score',()=>{
  assert.doesNotMatch(inviteClient,/saved\.board=\{/);
  assert.doesNotMatch(inviteClient,/localSubmit\?\.call/);
  assert.match(inviteClient,/CASTING ACCEPTED/);
  assert.match(inviteClient,/관계 분석과 캐릭터를 만드는 중/);
});

test('a fresh invite shows a neutral validation state before the server decides validity',()=>{
  assert.match(app,/친구의 영화를<br>불러오고 있어요/);
  assert.match(app,/초대 상태와 공개 정보를 안전하게 확인하는 중/);
  assert.doesNotMatch(app,/visitorPagePublic[\s\S]{0,500}상영이 종료된 링크예요/);
  assert.match(inviteClient,/server-invite-error/);
});

test('public reel routing mounts only the server-backed visitor renderer',()=>{
  const render=app.match(/function render\(\)\{[^\n]+/)?.[0]||'';
  assert.match(render,/visitorPagePublic\(publicId\)/);
  assert.doesNotMatch(render,/visitorPageV2\(publicId\)/);
  assert.doesNotMatch(app,/visitorPageV2=visitorPagePublic/);
});

// These are intentionally visible as TODO until a real token-backed server flow exists.
// Converting one to a passing test requires exercising the deployed app and verifying DB rows.
const normalCases = [
  'owner can create an invite',
  'generated invite URL opens in a separate session',
  'valid invite renders the correct board entry screen',
  'participant can submit required information',
  'submission creates an INVITE cast member on the correct board',
  'submission creates and links invite participation',
  'owner board reflects the participant',
  'analysis process is connected after submission',
];

const abnormalCases = [
  'nonexistent token shows a safe error state',
  'malformed token shows a safe error state',
  'disabled invite is rejected server-side',
  'expired invite is rejected server-side',
  'invite for a deleted board is rejected',
  'tampered board_id cannot redirect the submission',
  'duplicate participation follows the defined policy',
  'withdrawn participant revisit follows the defined policy',
  'missing required fields show validation errors',
  'invalid birth date is rejected',
  'invalid birth time is rejected',
  'network or database failure shows a recoverable error state',
];

for (const name of [...normalCases, ...abnormalCases]) test.todo(`invite E2E: ${name}`);
