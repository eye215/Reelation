import{supabase,getVerifiedUser}from'./supabase-client.js?v=auth-singleton-57';
const app=document.querySelector('#app');
async function decorateSession(){
  const settings=document.querySelector('.page .rank-card');if(!settings||settings.querySelector('.auth-session'))return;
  const user=await getVerifiedUser();if(!user)return;
  const provider=user.app_metadata?.provider||user.identities?.[0]?.provider||'kakao';
  const row=document.createElement('div');row.className='auth-session';row.innerHTML=`<div><b>${provider==='kakao'?'카카오 계정 연결됨':'로그인됨'}</b><small>영화와 출연진이 이 계정에 안전하게 저장돼요.</small></div><button type="button">로그아웃</button>`;
  row.querySelector('button').onclick=async()=>{await supabase.auth.signOut();localStorage.removeItem('reelation-state');location.href='/'};settings.after(row);
}
const observer=new MutationObserver(decorateSession);if(app)observer.observe(app,{childList:true,subtree:true});decorateSession();
supabase.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){window.__REELATION_AUTH_USER_ID__=null;document.documentElement.dataset.auth='anonymous'}else if(session?.user){window.__REELATION_AUTH_USER_ID__=session.user.id;document.documentElement.dataset.auth='authenticated'}});
