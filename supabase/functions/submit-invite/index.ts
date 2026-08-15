import{createClient}from'npm:@supabase/supabase-js@2.57.4';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type','Content-Type':'application/json'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
const sha=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
  const body=await req.json().catch(()=>null);if(!body)return json({error:'INVALID_BODY'},400);
  const authorization=req.headers.get('Authorization');if(!authorization)return json({error:'AUTH_REQUIRED'},401);
  const url=Deno.env.get('SUPABASE_URL')!,publishable=Deno.env.get('SUPABASE_ANON_KEY')!;
  const caller=createClient(url,publishable,{global:{headers:{Authorization:authorization}}});
  const{data:{user}}=await caller.auth.getUser();if(!user)return json({error:'AUTH_REQUIRED'},401);
  const{token,nickname,birthDate,birthTime,birthTimeKnown,gender,consentVersion}=body;
  if(typeof token!=='string'||!/^[A-Za-z0-9_-]{40,128}$/.test(token))return json({error:'INVALID_TOKEN'},400);
  if(typeof nickname!=='string'||nickname.trim().length<1||nickname.trim().length>40)return json({error:'INVALID_NICKNAME'},400);
  if(typeof birthDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)||new Date(birthDate)>new Date())return json({error:'INVALID_BIRTH_DATE'},400);
  if(!['MALE','FEMALE','OTHER'].includes(gender))return json({error:'INVALID_GENDER'},400);
  if(birthTimeKnown&&(typeof birthTime!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(birthTime)))return json({error:'INVALID_BIRTH_TIME'},400);
  if(consentVersion!=='invite-v1')return json({error:'CONSENT_REQUIRED'},400);
  const tokenHash=await sha(token),fingerprint=await sha([tokenHash,nickname.trim().toLowerCase(),birthDate,birthTimeKnown?birthTime:'unknown',gender].join('|'));
  const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const{data,error}=await admin.rpc('submit_authenticated_invite_participation',{p_participant_user_id:user.id,p_token_hash:tokenHash,p_submission_fingerprint:fingerprint,p_nickname:nickname,p_birth_date:birthDate,p_birth_time:birthTimeKnown?birthTime:null,p_birth_time_known:Boolean(birthTimeKnown),p_gender:gender,p_consent_version:consentVersion});
  if(error){const message=error.message||'';if(message.includes('DUPLICATE_PARTICIPATION'))return json({error:'DUPLICATE_PARTICIPATION'},409);if(message.includes('INVITE_INVALID'))return json({error:'INVITE_INVALID'},410);return json({error:'SUBMISSION_FAILED'},500)}
  const castMemberId=data?.[0]?.cast_member_id;
  EdgeRuntime.waitUntil(fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-invite-analysis-v2`,{method:'POST',headers:{Authorization:`Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,'Content-Type':'application/json'},body:JSON.stringify({castMemberId})}).catch(error=>console.error('analysis dispatch failed',error)));
  return json({ok:true,castMemberId,participationId:data?.[0]?.participation_id,analysisStatus:'PENDING'});
});
