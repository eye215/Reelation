import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync(new URL('./supabase/migrations/20260815154011_add_movie_platform_foundation.sql',import.meta.url),'utf8');
const hardening=readFileSync(new URL('./supabase/migrations/20260815154142_harden_movie_platform_access.sql',import.meta.url),'utf8');

test('movie lifecycle is explicit and separate from the casting board',()=>{
  assert.match(sql,/movie_status as enum \('DRAFT','GENERATING','COMPLETED','UPDATED','ARCHIVED'\)/);
  assert.match(sql,/create table if not exists public\.movies/);
  assert.match(sql,/board_id uuid not null unique references public\.casting_boards/);
});

test('AI output is immutable, versioned and cacheable',()=>{
  assert.match(sql,/create table if not exists public\.movie_versions/);
  assert.match(sql,/prompt_version text not null/);
  assert.match(sql,/model_version text not null/);
  assert.match(sql,/unique\(movie_id,input_hash,prompt_version,model_version\)/);
  assert.doesNotMatch(sql,/CAST_ADDED/);
});

test('cast changes only mark a completed movie updated',()=>{
  assert.match(sql,/cast_marks_movie_updated/);
  assert.match(sql,/status in \('COMPLETED','UPDATED'\)/);
  assert.doesNotMatch(sql,/insert into public\.movie_versions[\s\S]*mark_movie_cast_updated/);
});

test('public movie projection contains no birth or saju fields',()=>{
  const publicAlter=sql.match(/alter table public\.public_reels[\s\S]*?poster_image_key text;/)?.[0]??'';
  assert.match(publicAlter,/primary_genre/);
  assert.match(publicAlter,/poster_image_key/);
  assert.doesNotMatch(publicAlter,/birth|saju|relationship_analyses/);
});

test('new private entities use RLS and analytics stays server-only',()=>{
  for(const table of ['movies','movie_versions','analytics_events']) assert.match(sql,new RegExp(`alter table public\\.${table} enable row level security`));
  assert.match(hardening,/analytics_no_client_access/);
  assert.match(hardening,/bootstrap_owner_board[\s\S]*security invoker/);
});
