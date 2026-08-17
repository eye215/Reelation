import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const migration=read('supabase/migrations/20260816090000_add_generation_pipeline.sql');
const request=read('supabase/functions/request-movie-generation/index.ts');
const process=read('supabase/functions/process-movie-generation/index.ts');
const submit=read('supabase/functions/submit-invite/index.ts');
const analysis=read('supabase/functions/process-invite-analysis/index.ts');

test('invite participation requires a verified user at the API and transaction layers',()=>{
  assert.match(submit,/caller\.auth\.getUser/);
  assert.match(read('invite-integration.js'),/submit-invite-auth/);
  assert.match(submit,/submit_authenticated_invite_participation/);
  assert.match(migration,/participant_user_id uuid/);
  assert.match(migration,/AUTH_REQUIRED/);
});

test('analysis completion recalculates rankings using a server-only transaction',()=>{
  assert.match(analysis,/recalculate_board_rankings/);
  assert.doesNotMatch(analysis,/overall_score:\s*Math\.round/);
  assert.doesNotMatch(analysis,/score:\s*Math\.round\(category\.score\)/);
  assert.match(analysis,/job\.status === 'DONE'/);
  assert.match(migration,/delete from public\.rankings where board_id=p_board_id/);
  assert.match(migration,/grant execute on function public\.recalculate_board_rankings\(uuid\) to service_role/);
});

test('invite analysis dispatch detects rejected responses and retries the deployed function name',()=>{
  assert.match(submit,/response\.ok/);
  assert.match(submit,/process-invite-analysis-v2/);
  assert.match(submit,/process-invite-analysis'/);
  assert.match(submit,/analysis dispatch exhausted/);
});

test('movie jobs are explicit, versioned, cached, and dispatched in the background',()=>{
  assert.match(request,/EdgeRuntime\.waitUntil/);
  assert.match(request,/inputHash/);
  assert.match(request,/movie_generation_jobs/);
  assert.match(process,/gpt-image-2/);
});

test('poster artifacts are immutable storage objects and only publish after success',()=>{
  assert.match(migration,/movie-posters/);
  assert.match(process,/upsert:false/);
  assert.match(process,/poster_status:'DONE'/);
  assert.match(process,/public_reels/);
});

test('dynamic share page emits OG metadata',()=>{
  const share=read('supabase/functions/share-reel/index.ts');
  assert.match(share,/og:title/);
  assert.match(share,/og:image/);
  assert.match(share,/movie-posters/);
});

test('invite submission links the authenticated user to the submitted birth profile',()=>{
  const linkMigration=read('supabase/migrations/20260816170000_link_invite_birth_profile_to_user.sql');
  assert.match(linkMigration,/birth_profile_id=excluded\.birth_profile_id/);
  assert.match(linkMigration,/source_type,birth_profile_id,status/);
});

test('completed invite analysis publishes a non-sensitive character image key',()=>{
  assert.match(migration,/character_image_key text/);
  assert.match(migration,/c\.character_image_key/);
  assert.match(analysis,/characterImageKey/);
  assert.match(analysis,/pillars\/\$\{castSaju\.dayPillarIndex\}/);
});

test('owner sync merges completed server participants into the casting board',()=>{
  const ownerSync=read('owner-sync.js');
  const app=read('app.js');
  assert.match(ownerSync,/relationship_analyses/);
  assert.match(ownerSync,/genre_analyses/);
  assert.match(ownerSync,/reelation-server-cast-synced/);
  assert.match(app,/reelation-server-cast-synced/);
  assert.match(app,/byId\.set\(member\.id,member\)/);
});
