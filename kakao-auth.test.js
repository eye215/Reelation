import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync('app.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20260816103000_add_kakao_auth_layer.sql','utf8');

test('owner onboarding requires Kakao OAuth before birth submission',()=>{
  assert.match(app,/signInWithOAuth\(\{provider:'kakao'/);
  assert.match(app,/p_birth_date/);
  assert.match(app,/state\.authUserId\?startPage\(\):loginGate\(\)/);
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
