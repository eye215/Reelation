document.documentElement.dataset.auth='checking';
window.__REELATION_AUTH_USER_ID__=null;
document.documentElement.dataset.auth='anonymous';

import('./app.js?v=main-ia-63').then(async()=>{
 try{
  const{getVerifiedUser,supabase}=await import('./supabase-client.js?v=auth-singleton-57');
  window.__REELATION_SUPABASE__=supabase;
  const timeout=new Promise(resolve=>setTimeout(()=>resolve(null),3000));
  let user=await Promise.race([getVerifiedUser().catch(()=>null),timeout]);
  window.__REELATION_AUTH_USER_ID__=user?.id||null;
  document.documentElement.dataset.auth=user?'authenticated':'anonymous';
  let board=null;
  if(user&&location.pathname==='/invite'){
    const state=JSON.parse(localStorage.getItem('reelation-state')||'null');
    if(state?.owner?.birthDate){
      const known=state.owner.birthTime&&state.owner.birthTime!=='unknown';
      const{data}=await supabase.rpc('bootstrap_owner_board',{p_nickname:state.owner.nickname,p_birth_date:state.owner.birthDate,p_birth_time:known?state.owner.birthTime:null,p_birth_time_known:Boolean(known),p_gender:state.owner.gender});
      board=data?.[0]||null;
    }
  }
  window.dispatchEvent(new CustomEvent('reelation-auth-ready',{detail:{userId:user?.id||null,board}}));
 }catch{
   document.documentElement.dataset.auth='anonymous';
   window.dispatchEvent(new CustomEvent('reelation-auth-ready',{detail:{userId:null}}));
 }
}).catch(()=>{
 const fallback=document.querySelector('.boot-fallback');
 if(fallback){fallback.classList.add('boot-failed');fallback.querySelector('p').textContent='앱을 불러오지 못했어요. 다시 시도해주세요.'}
});
