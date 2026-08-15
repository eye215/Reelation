import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';

const SUPABASE_URL='https://gnzcatibyrqbxxdnsdua.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_TOCoxThfi63_OhtodkhqAQ_qTlI8qty';
let providerStatusCache=null;

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

export async function getAuthProviderStatus({force=false}={}){
  if(providerStatusCache&&!force)return providerStatusCache;
  const response=await fetch(`${SUPABASE_URL}/auth/v1/settings`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY}});
  if(!response.ok)throw new Error('AUTH_SETTINGS_UNAVAILABLE');
  const settings=await response.json();
  providerStatusCache={kakao:settings?.external?.kakao===true,checkedAt:Date.now()};
  return providerStatusCache;
}

export async function signInWithKakao(returnPath=location.pathname){
  try{
    const status=await getAuthProviderStatus({force:true});
    if(!status.kakao)return{error:new Error('KAKAO_PROVIDER_DISABLED'),code:'KAKAO_PROVIDER_DISABLED'};
  }catch(error){
    if(error?.message==='KAKAO_PROVIDER_DISABLED')return{error,code:'KAKAO_PROVIDER_DISABLED'};
  }
  sessionStorage.setItem('reelation-auth-return',returnPath);
  const result=await supabase.auth.signInWithOAuth({provider:'kakao',options:{redirectTo:`${location.origin}${returnPath}`}});
  return{...result,code:result.error?'KAKAO_OAUTH_FAILED':null};
}
