import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync('app.js','utf8');
const client=fs.readFileSync('supabase-client.js','utf8');
const invite=fs.readFileSync('invite-integration.js','utf8');
const bootstrap=fs.readFileSync('bootstrap.js','utf8');
const session=fs.readFileSync('auth-session.js','utf8');
const ownerSync=fs.readFileSync('owner-sync.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20260816103000_add_kakao_auth_layer.sql','utf8');

test('owner onboarding requires email magic-link auth before birth submission',()=>{
  assert.match(client,/signInWithOtp/);
  assert.match(client,/shouldCreateUser:true/);
  assert.match(client,/emailRedirectTo/);
  assert.match(app,/signInWithMagicLink/);
  assert.match(app,/p_birth_date/);
  assert.match(app,/state\.authUserId\?startPage\(\):loginGate\(\)/);
});
test('invite participation uses the same email magic-link identity',()=>{
  assert.match(invite,/signInWithMagicLink/);
  assert.doesNotMatch(invite,/signInWithOAuth/);
});
test('Kakao is an optional linked identity instead of the primary account',()=>{
  assert.match(client,/linkIdentity\(\{provider:'kakao'/);
  assert.match(session,/data-link-kakao/);
  assert.doesNotMatch(client,/signInWithOAuth/);
});
test('every browser module imports the same Supabase singleton URL',()=>{
  for(const source of [app,invite,bootstrap,session,ownerSync])assert.doesNotMatch(source,/supabase-client\.js\?v=auth-singleton-57/);
  for(const source of [app,invite,bootstrap,session,ownerSync])assert.match(source,/supabase-client\.js\?v=magic-link-72/);
});
test('Kakao identity creates a public profile without duplicating provider ids',()=>{
  assert.match(migration,/handle_new_auth_user/);
  assert.match(migration,/raw_app_meta_data->>'provider'/);
  assert.doesNotMatch(migration,/kakao_id/i);
});
test('birth profile remains separate and is attached during owner bootstrap',()=>{
  assert.match(migration,/insert into public\.birth_profiles/);
  assert.match(migration,/birth_profile_id=v_birth_id/);
});
test('visitor shell reuses the single global toast region',()=>{
  assert.match(app,/function visitorLayout\(content\)\{app\.innerHTML=`<div class="visitor-shell">\$\{content\}<\/div>`/);
});
