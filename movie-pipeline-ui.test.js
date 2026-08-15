import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const pipeline=fs.readFileSync('movie-pipeline.js','utf8');

test('completed movie poster is loaded from immutable public storage',()=>{
  assert.match(pipeline,/poster_image_key/);
  assert.match(pipeline,/storage\.from\('movie-posters'\)\.getPublicUrl/);
  assert.match(pipeline,/generated-movie-poster/);
});

test('latest failed generation is recoverable without removing the current movie',()=>{
  assert.match(pipeline,/movie_generation_jobs/);
  assert.match(pipeline,/lastJob\?\.status==='FAILED'/);
  assert.match(pipeline,/다시 제작하기/);
  assert.match(pipeline,/기존 화면은 그대로 유지됩니다/);
});
