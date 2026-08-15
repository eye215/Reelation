import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
Deno.serve(async req=>{
  const publicId=new URL(req.url).searchParams.get('publicId')||'';
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const{data:reel}=await admin.from('public_reels').select('public_id,owner_nickname,title,tagline,poster_image_key,is_active').eq('public_id',publicId).eq('is_active',true).maybeSingle();
  if(!reel)return new Response('Not found',{status:404});
  const target=`https://reelation.yullul.com/reel/${encodeURIComponent(publicId)}`;
  const image=reel.poster_image_key?`${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/movie-posters/${reel.poster_image_key}`:'https://reelation.yullul.com/assets/day-stem-characters-v2.jpg';
  const title=`${reel.owner_nickname}의 Reelation`;
  const description=reel.tagline||'이 영화에서 당신은 어떤 역할일까요?';
  return new Response(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title><meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:image" content="${esc(image)}"><meta property="og:url" content="${esc(target)}"><meta name="twitter:card" content="summary_large_image"><meta http-equiv="refresh" content="0;url=${esc(target)}"></head><body><a href="${esc(target)}">Reelation 열기</a></body></html>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=300'}});
});
