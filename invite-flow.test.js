import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
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

test('current client does not yet implement token lookup or invite submission', () => {
  assert.doesNotMatch(app, /supabase\.(from|rpc)\(/);
  assert.doesNotMatch(app, /\/invite\/:token/);
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
