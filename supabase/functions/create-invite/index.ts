import{createClient}from'npm:@supabase/supabase-js@2.57.4';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type','Content-Type':'application/json'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
  const authorization=req.headers.get('Authorization');if(!authorization)return json({error:'AUTH_REQUIRED'},401);
  const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}}});
  const{data:{user},error:userError}=await client.auth.getUser();if(userError||!user)return json({error:'AUTH_REQUIRED'},401);
  const{boardId}=await req.json().catch(()=>({}));if(!boardId)return json({error:'BOARD_REQUIRED'},400);
  const{data:board}=await client.from('casting_boards').select('id,public_id,invite_enabled').eq('id',boardId).eq('owner_user_id',user.id).maybeSingle();
  if(!board)return json({error:'BOARD_NOT_FOUND'},404);
  const bytes=crypto.getRandomValues(new Uint8Array(32));const token=btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  const expiresAt=new Date(Date.now()+30*24*60*60*1000).toISOString();
  const{error}=await client.from('invites').insert({board_id:board.id,token_hash:await hash(token),status:'ACTIVE',expires_at:expiresAt});
  if(error)return json({error:'INVITE_CREATE_FAILED'},500);
  return json({token,url:`${req.headers.get('origin')||'https://reelation.yullul.com'}/reel/${token}`,expiresAt});
});
