import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
const PROMPT_VERSION='relationship-narrative-v1';
const MODEL_VERSION='gpt-5-mini';
const clip=(value:unknown,max:number)=>String(value??'').trim().slice(0,max);

const schema={
  type:'object',additionalProperties:false,
  properties:{
    headline:{type:'string',maxLength:30},
    summary:{type:'string',maxLength:160},
    role_reason:{type:'string',maxLength:220},
    relationship_pattern:{type:'string',maxLength:220},
    conflict_pattern:{type:'string',maxLength:180},
    long_term_pattern:{type:'string',maxLength:180},
  },
  required:['headline','summary','role_reason','relationship_pattern','conflict_pattern','long_term_pattern'],
};

Deno.serve(async req=>{
  if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
  const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if(req.headers.get('Authorization')!==`Bearer ${serviceKey}`)return json({error:'FORBIDDEN'},403);
  const{analysisId}=await req.json().catch(()=>({}));
  if(!analysisId)return json({error:'ANALYSIS_REQUIRED'},400);
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,serviceKey);

  const{data:cached}=await admin.from('narratives').select('id,status').eq('relationship_analysis_id',analysisId).eq('prompt_version',PROMPT_VERSION).maybeSingle();
  if(cached?.status==='DONE')return json({ok:true,cached:true,narrativeId:cached.id});

  try{
    const{data:analysis,error}=await admin.from('relationship_analyses').select('id,board_id,cast_member_id,overall_score,attraction_score,stability_score,impact_score,growth_score,longevity_score,cooperation_score,conflict_score,cast_tier,life_role,relationship_genre,feature_codes').eq('id',analysisId).single();
    if(error)throw error;
    const[{data:cast},{data:board},{data:genres}]=await Promise.all([
      admin.from('cast_members').select('nickname').eq('id',analysis.cast_member_id).single(),
      admin.from('casting_boards').select('owner_user_id').eq('id',analysis.board_id).single(),
      admin.from('genre_analyses').select('genre,score,role').eq('relationship_analysis_id',analysisId),
    ]);
    const{data:owner}=await admin.from('users').select('nickname').eq('id',board?.owner_user_id).single();
    const input={owner:owner?.nickname||'주인공',cast:cast?.nickname||'상대',castTier:analysis.cast_tier,lifeRole:analysis.life_role,relationshipGenre:analysis.relationship_genre,scores:{overall:analysis.overall_score,attraction:analysis.attraction_score,stability:analysis.stability_score,impact:analysis.impact_score,growth:analysis.growth_score,longevity:analysis.longevity_score,cooperation:analysis.cooperation_score,conflict:analysis.conflict_score},categories:genres||[],featureCodes:analysis.feature_codes||[]};
    const prompt=`두 사람의 구조화된 관계 분석 데이터를 영화 속 관계 언어로 해석하세요. 점수와 분류를 절대 변경하거나 새로 계산하지 마세요. 사주, 오행, 궁합, 운명 같은 용어를 노출하지 마세요. 실제 연애를 단정하지 말고 관계의 행동 리듬, 긴장, 변화와 성장 가능성을 구체적으로 쓰세요. 어느 관계에도 적용되는 상투적인 칭찬을 피하고 한국어로 작성하세요. summary는 전체 해석의 짧은 예고편, 나머지 필드는 서로 겹치지 않는 관찰이어야 합니다. 입력: ${JSON.stringify(input)}`;
    const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${Deno.env.get('OPENAI_API_KEY')}`,'Content-Type':'application/json'},body:JSON.stringify({model:MODEL_VERSION,input:[{role:'system',content:'You write grounded Korean relationship narratives for Reelation. Structured scoring is authoritative; you only interpret it.'},{role:'user',content:prompt}],text:{format:{type:'json_schema',name:'relationship_narrative',strict:true,schema}}})});
    if(!response.ok)throw new Error(`OPENAI_RESPONSES_${response.status}`);
    const payload=await response.json();
    const outputText=payload.output_text||payload.output?.flatMap((item:any)=>item.content||[]).find((item:any)=>item.type==='output_text')?.text;
    if(!outputText)throw new Error('NARRATIVE_OUTPUT_MISSING');
    const result=JSON.parse(outputText);
    const row={relationship_analysis_id:analysisId,prompt_version:PROMPT_VERSION,model_version:MODEL_VERSION,headline:clip(result.headline,30),summary:clip(result.summary,160),role_reason:clip(result.role_reason,220),relationship_pattern:clip(result.relationship_pattern,220),conflict_pattern:clip(result.conflict_pattern,180),long_term_pattern:clip(result.long_term_pattern,180),status:'DONE',updated_at:new Date().toISOString()};
    const{data:narrative,error:saveError}=await admin.from('narratives').upsert(row,{onConflict:'relationship_analysis_id,prompt_version'}).select('id').single();
    if(saveError)throw saveError;
    await admin.from('relationship_analyses').update({status:'DONE',updated_at:new Date().toISOString()}).eq('id',analysisId);
    return json({ok:true,cached:false,narrativeId:narrative.id});
  }catch(error){
    const message=(error instanceof Error?error.message:'NARRATIVE_FAILED').slice(0,500);
    await admin.from('narratives').upsert({relationship_analysis_id:analysisId,prompt_version:PROMPT_VERSION,model_version:MODEL_VERSION,headline:'관계 서사 준비 중',summary:'관계 분석은 완료되었지만 서사 생성은 잠시 후 다시 시도할 수 있어요.',role_reason:'구조화된 관계 결과는 안전하게 저장되었습니다.',relationship_pattern:'서사 생성만 다시 시도할 수 있습니다.',conflict_pattern:'',long_term_pattern:'',status:'FAILED',updated_at:new Date().toISOString()},{onConflict:'relationship_analysis_id,prompt_version'});
    await admin.from('relationship_analyses').update({status:'DONE',updated_at:new Date().toISOString()}).eq('id',analysisId);
    return json({error:'NARRATIVE_FAILED',detail:message,analysisAvailable:true},500);
  }
});
