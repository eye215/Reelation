async function loadSupabaseModule(){
  const sources=[
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm',
    'https://esm.sh/@supabase/supabase-js@2.57.4?bundle',
  ];
  let lastError;
  for(const source of sources){
    try{
      const modulePromise=import(source);
      const timeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('SUPABASE_CDN_TIMEOUT')),2500));
      return await Promise.race([modulePromise,timeout]);
    }catch(error){lastError=error}
  }
  throw lastError||new Error('SUPABASE_CLIENT_UNAVAILABLE');
}

const{createClient}=await loadSupabaseModule();

const SUPABASE_URL='https://gnzcatibyrqbxxdnsdua.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_TOCoxThfi63_OhtodkhqAQ_qTlI8qty';

// Keep one GoTrue client even when cache-busted browser modules are evaluated
// more than once. Multiple clients share the same storage key and can race
// while restoring or refreshing a Kakao session.
export const supabase=window.__REELATION_SUPABASE_CLIENT__||(
  window.__REELATION_SUPABASE_CLIENT__=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},
  })
);

export async function getVerifiedUser(){
  try{
    const{data,error}=await supabase.auth.getUser();
    if(error)return null;
    return data.user||null;
  }catch{return null}
}

export async function signInWithMagicLink(email,returnPath=location.pathname){
  const normalizedEmail=String(email||'').trim().toLowerCase();
  if(!normalizedEmail||!/^\S+@\S+\.\S+$/.test(normalizedEmail))return{error:new Error('INVALID_EMAIL'),code:'INVALID_EMAIL'};
  sessionStorage.setItem('reelation-auth-return',returnPath);
  const result=await supabase.auth.signInWithOtp({email:normalizedEmail,options:{shouldCreateUser:true,emailRedirectTo:`${location.origin}${returnPath}`}});
  return{...result,code:result.error?'MAGIC_LINK_FAILED':null};
}

export async function signInWithKakao(returnPath=location.pathname){
  sessionStorage.setItem('reelation-auth-return',returnPath);
  const result=await supabase.auth.signInWithOAuth({provider:'kakao',options:{redirectTo:`${location.origin}${returnPath}`,scopes:'profile_nickname profile_image'}});
  return{...result,code:result.error?'KAKAO_OAUTH_FAILED':null};
}

export async function linkKakaoIdentity(returnPath='/settings'){
  sessionStorage.setItem('reelation-auth-return',returnPath);
  const result=await supabase.auth.linkIdentity({provider:'kakao',options:{redirectTo:`${location.origin}${returnPath}`,scopes:'profile_nickname profile_image'}});
  return{...result,code:result.error?'KAKAO_LINK_FAILED':null};
}
