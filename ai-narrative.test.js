import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
const narrative=readFileSync('supabase/functions/process-relationship-narrative/index.ts','utf8');
const analysis=readFileSync('supabase/functions/process-invite-analysis/index.ts','utf8');
test('AI narrative uses versioned structured output without recalculating scores',()=>{
  assert.match(narrative,/relationship-narrative-v1/);
  assert.match(narrative,/text:\{format:\{type:'json_schema'/);
  assert.match(narrative,/점수와 분류를 절대 변경하거나 새로 계산하지 마세요/);
  assert.match(narrative,/onConflict:'relationship_analysis_id,prompt_version'/);
});
test('AI narrative failure does not invalidate structured analysis',()=>{
  assert.match(narrative,/analysisAvailable:true/);
  assert.match(narrative,/update\(\{status:'DONE'/);
  assert.match(analysis,/process-relationship-narrative/);
  assert.match(analysis,/Structured scores and rankings remain usable/);
});
