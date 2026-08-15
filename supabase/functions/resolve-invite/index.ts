import{createClient}from'npm:@supabase/supabase-js@2.57.4';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'apikey,content-type','Content-Type':'application/json'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
  const{token}=await req.json().catch(()=>({}));if(typeof token!=='string'||!/^[A-Za-z0-9_-]{40,128}$/.test(token))return json({error:'INVALID_TOKEN'},400);
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const{data:invite}=await admin.from('invites').select('id,board_id,status,expires_at').eq('token_hash',await hash(token)).maybeSingle();
  if(!invite)return json({error:'INVITE_NOT_FOUND'},404);
  if(invite.status!=='ACTIVE')return json({error:'INVITE_DISABLED'},410);
  if(invite.expires_at&&new Date(invite.expires_at)<=new Date())return json({error:'INVITE_EXPIRED'},410);
  const{data:board}=await admin.from('casting_boards').select('id,public_id,title,invite_enabled,users!casting_boards_owner_user_id_fkey(nickname)').eq('id',invite.board_id).maybeSingle();
  if(!board||!board.invite_enabled)return json({error:'INVITE_DISABLED'},410);
  const{count}=await admin.from('cast_members').select('id',{count:'exact',head:true}).eq('board_id',board.id).eq('status','ACTIVE');
  const owner=Array.isArray(board.users)?board.users[0]:board.users;
  return json({valid:true,publicId:board.public_id,ownerNickname:owner?.nickname||'주인공',title:board.title,castCount:count||0});
});
