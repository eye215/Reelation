import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';

const SUPABASE_URL='https://gnzcatibyrqbxxdnsdua.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_TOCoxThfi63_OhtodkhqAQ_qTlI8qty';

export const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},
});

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

export async function linkKakaoIdentity(returnPath='/settings'){
  sessionStorage.setItem('reelation-auth-return',returnPath);
  const result=await supabase.auth.linkIdentity({provider:'kakao',options:{redirectTo:`${location.origin}${returnPath}`}});
  return{...result,code:result.error?'KAKAO_LINK_FAILED':null};
}
