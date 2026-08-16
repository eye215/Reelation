document.documentElement.dataset.auth='checking';
const recoveredPath=sessionStorage.getItem('reelation-spa-path');
if(recoveredPath&&location.pathname==='/'){
  sessionStorage.removeItem('reelation-spa-path');
  history.replaceState({},'',recoveredPath);
}
window.__REELATION_AUTH_USER_ID__=null;
document.documentElement.dataset.auth='anonymous';

import('./app.js?v=cdn-fallback-96').then(async()=>{
 try{
  const{getVerifiedUser,supabase}=await import('./supabase-client.js?v=cdn-fallback-96');
  window.__REELATION_SUPABASE__=supabase;
  const timeout=new Promise(resolve=>setTimeout(()=>resolve(null),3000));
  let user=await Promise.race([getVerifiedUser().catch(()=>null),timeout]);
  window.__REELATION_AUTH_USER_ID__=user?.id||null;
  document.documentElement.dataset.auth=user?'authenticated':'anonymous';
  let board=null;
  let ownerProfile=null;
  if(user){
    const{data:existing}=await supabase.from('casting_boards').select('id,public_id').eq('owner_user_id',user.id).maybeSingle();
    if(existing)board={board_id:existing.id,public_id:existing.public_id};
    const{data:userRow}=await supabase.from('users').select('nickname,birth_profile_id').eq('id',user.id).maybeSingle();
    if(userRow?.birth_profile_id){
      const{data:birth}=await supabase.from('birth_profiles').select('birth_date,birth_time,birth_time_known,gender').eq('id',userRow.birth_profile_id).maybeSingle();
      if(birth)ownerProfile={nickname:userRow.nickname,birthDate:birth.birth_date,birthTime:birth.birth_time_known&&birth.birth_time?String(birth.birth_time).slice(0,5):'unknown',gender:birth.gender};
    }
  }
  if(user&&!board){
    const state=JSON.parse(localStorage.getItem('reelation-state')||'null');
    if(state?.owner?.birthDate){
      const known=state.owner.birthTime&&state.owner.birthTime!=='unknown';
      const{data}=await supabase.rpc('bootstrap_owner_board',{p_nickname:state.owner.nickname,p_birth_date:state.owner.birthDate,p_birth_time:known?state.owner.birthTime:null,p_birth_time_known:Boolean(known),p_gender:state.owner.gender});
      board=data?.[0]||null;
    }
  }
  window.dispatchEvent(new CustomEvent('reelation-auth-ready',{detail:{userId:user?.id||null,board,ownerProfile}}));
 }catch{
   document.documentElement.dataset.auth='anonymous';
   window.dispatchEvent(new CustomEvent('reelation-auth-ready',{detail:{userId:null}}));
 }
}).catch(()=>{
 const fallback=document.querySelector('.boot-fallback');
 if(fallback){fallback.classList.add('boot-failed');fallback.querySelector('p').textContent='앱을 불러오지 못했어요. 다시 시도해주세요.'}
});
