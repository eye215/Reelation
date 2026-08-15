import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type','Content-Type':'application/json'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
const sha=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
  const auth=req.headers.get('Authorization');
  if(!auth)return json({error:'AUTH_REQUIRED'},401);
  const url=Deno.env.get('SUPABASE_URL')!,publishable=Deno.env.get('SUPABASE_ANON_KEY')!,serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const caller=createClient(url,publishable,{global:{headers:{Authorization:auth}}});
  const{data:{user}}=await caller.auth.getUser();
  if(!user)return json({error:'AUTH_REQUIRED'},401);
  const{movieId,reason='MANUAL_REGENERATE'}=await req.json().catch(()=>({}));
  if(!movieId||!['INITIAL','MANUAL_REGENERATE','NEW_INTERPRETATION'].includes(reason))return json({error:'INVALID_REQUEST'},400);
  const admin=createClient(url,serviceKey);
  const{data:movie}=await admin.from('movies').select('id,board_id,owner_user_id,title,primary_genre,character_type,tagline,current_version,status').eq('id',movieId).maybeSingle();
  if(!movie||movie.owner_user_id!==user.id)return json({error:'FORBIDDEN'},403);
  const input={title:movie.title,genre:movie.primary_genre,characterType:movie.character_type,tagline:movie.tagline};
  const inputHash=await sha(JSON.stringify(input));
  const promptVersion='movie-poster-v1',modelVersion='gpt-image-2-2026-04-21';
  const{data:cached}=await admin.from('movie_versions').select('id,movie_version,poster_status,poster_image_key').eq('movie_id',movie.id).eq('input_hash',inputHash).eq('prompt_version',promptVersion).eq('model_version',modelVersion).eq('poster_status','DONE').maybeSingle();
  if(cached){
    await admin.from('movies').update({status:'COMPLETED',current_version:cached.movie_version,generation_completed_at:new Date().toISOString()}).eq('id',movie.id);
    return json({ok:true,cached:true,version:cached.movie_version,posterImageKey:cached.poster_image_key});
  }
  const{data:lastVersion}=await admin.from('movie_versions').select('movie_version').eq('movie_id',movie.id).order('movie_version',{ascending:false}).limit(1).maybeSingle();
  const nextVersion=(lastVersion?.movie_version||0)+1;
  const{data:version,error:versionError}=await admin.from('movie_versions').insert({movie_id:movie.id,movie_version:nextVersion,prompt_version:promptVersion,model_version:modelVersion,input_hash:inputHash,generation_reason:reason,movie_payload:input,poster_status:'PENDING'}).select('id').single();
  if(versionError)return json({error:'GENERATION_ALREADY_REQUESTED'},409);
  const{data:job,error:jobError}=await admin.from('movie_generation_jobs').insert({movie_id:movie.id,movie_version_id:version.id,requested_by:user.id}).select('id').single();
  if(jobError)return json({error:'JOB_CREATE_FAILED'},500);
  await admin.from('movies').update({status:'GENERATING',generation_started_at:new Date().toISOString()}).eq('id',movie.id);
  EdgeRuntime.waitUntil(fetch(`${url}/functions/v1/process-movie-generation`,{method:'POST',headers:{Authorization:`Bearer ${serviceKey}`,'Content-Type':'application/json'},body:JSON.stringify({jobId:job.id})}).catch(console.error));
  return json({ok:true,cached:false,jobId:job.id,version:nextVersion,status:'PENDING'},202);
});
