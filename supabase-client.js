import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';

const SUPABASE_URL='https://gnzcatibyrqbxxdnsdua.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_TOCoxThfi63_OhtodkhqAQ_qTlI8qty';

export const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},
});

export async function getVerifiedUser(){
  const{data,error}=await supabase.auth.getUser();
  if(error)return null;
  return data.user||null;
}
