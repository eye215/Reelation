import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
const decode=(value:string)=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));

Deno.serve(async req=>{
  if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
  const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if(req.headers.get('Authorization')!==`Bearer ${serviceKey}`)return json({error:'FORBIDDEN'},403);
  const{jobId}=await req.json().catch(()=>({}));
  if(!jobId)return json({error:'JOB_REQUIRED'},400);
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,serviceKey);
  const{data:job}=await admin.from('movie_generation_jobs').select('id,movie_id,movie_version_id,status,attempts').eq('id',jobId).maybeSingle();
  if(!job)return json({error:'JOB_NOT_FOUND'},404);
  if(job.status==='DONE')return json({ok:true,cached:true});
  await admin.from('movie_generation_jobs').update({status:'PROCESSING',attempts:job.attempts+1,started_at:new Date().toISOString()}).eq('id',job.id);
  await admin.from('movie_versions').update({poster_status:'GENERATING'}).eq('id',job.movie_version_id);
  try{
    const{data:version,error}=await admin.from('movie_versions').select('movie_version,movie_payload').eq('id',job.movie_version_id).single();
    if(error)throw error;
    const p=version.movie_payload||{};
    const prompt=`Create an original cinematic vertical movie poster for a Korean mobile relationship app. Genre: ${p.genre||'growth drama'}. Protagonist archetype: ${p.characterType||'a changing protagonist'}. Theme: ${p.tagline||'relationships reshape the next scene'}. Strong single character still, environmental storytelling, contemporary streaming key art, no typography, no logos, no copyrighted characters, no imitation of a named filmmaker.`;
    const imageResponse=await fetch('https://api.openai.com/v1/images/generations',{method:'POST',headers:{Authorization:`Bearer ${Deno.env.get('OPENAI_API_KEY')}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-image-2',prompt,size:'1024x1536',quality:'medium',output_format:'png'})});
    if(!imageResponse.ok)throw new Error(`IMAGE_API_${imageResponse.status}`);
    const payload=await imageResponse.json();
    let bytes:Uint8Array;
    if(payload.data?.[0]?.b64_json)bytes=decode(payload.data[0].b64_json);
    else if(payload.data?.[0]?.url){const remote=await fetch(payload.data[0].url);if(!remote.ok)throw new Error('IMAGE_DOWNLOAD_FAILED');bytes=new Uint8Array(await remote.arrayBuffer());}
    else throw new Error('IMAGE_PAYLOAD_MISSING');
    const key=`movies/${job.movie_id}/v${version.movie_version}.png`;
    const{error:uploadError}=await admin.storage.from('movie-posters').upload(key,bytes,{contentType:'image/png',cacheControl:'31536000',upsert:false});
    if(uploadError)throw uploadError;
    const now=new Date().toISOString();
    await admin.from('movie_versions').update({poster_status:'DONE',poster_image_key:key,generated_at:now}).eq('id',job.movie_version_id);
    const{data:movie}=await admin.from('movies').update({status:'COMPLETED',current_version:version.movie_version,generation_completed_at:now}).eq('id',job.movie_id).select('board_id').single();
    await admin.from('public_reels').update({poster_image_key:key,updated_at:now}).eq('board_id',movie.board_id);
    await admin.from('movie_generation_jobs').update({status:'DONE',completed_at:now,last_error:null}).eq('id',job.id);
    await admin.from('analytics_events').insert({event_name:'poster_generated',movie_id:job.movie_id,board_id:movie.board_id,properties:{version:version.movie_version}});
    return json({ok:true,key,version:version.movie_version});
  }catch(error){
    const message=(error instanceof Error?error.message:'GENERATION_FAILED').slice(0,500),now=new Date().toISOString();
    await admin.from('movie_versions').update({poster_status:'FAILED'}).eq('id',job.movie_version_id);
    await admin.from('movie_generation_jobs').update({status:'FAILED',last_error:message,completed_at:now}).eq('id',job.id);
    const{count}=await admin.from('movie_versions').select('id',{count:'exact',head:true}).eq('movie_id',job.movie_id).eq('poster_status','DONE');
    await admin.from('movies').update({status:(count||0)>0?'COMPLETED':'DRAFT'}).eq('id',job.movie_id);
    return json({error:'GENERATION_FAILED',detail:message},500);
  }
});

