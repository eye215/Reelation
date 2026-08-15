document.documentElement.dataset.auth='checking';
window.__REELATION_AUTH_USER_ID__=null;
document.documentElement.dataset.auth='anonymous';
await import('./app.js?v=auth-fallback-46');

try{
  const{getVerifiedUser,supabase}=await import('./supabase-client.js?v=auth-fallback-46');
  window.__REELATION_SUPABASE__=supabase;
  const timeout=new Promise(resolve=>setTimeout(()=>resolve(null),3000));
  const user=await Promise.race([getVerifiedUser().catch(()=>null),timeout]);
  window.__REELATION_AUTH_USER_ID__=user?.id||null;
  document.documentElement.dataset.auth=user?'authenticated':'anonymous';
  window.dispatchEvent(new CustomEvent('reelation-auth-ready',{detail:{userId:user?.id||null}}));
}catch{
  document.documentElement.dataset.auth='anonymous';
  window.dispatchEvent(new CustomEvent('reelation-auth-ready',{detail:{userId:null}}));
}
