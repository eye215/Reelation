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
  assert.match(migration,/delete from public\.rankings where board_id=p_board_id/);
  assert.match(migration,/grant execute on function public\.recalculate_board_rankings\(uuid\) to service_role/);
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
