import{supabase,getVerifiedUser,linkKakaoIdentity}from'./supabase-client.js?v=auth-global-92';
const app=document.querySelector('#app');
async function decorateSession(){
  const settings=document.querySelector('.page .rank-card');if(!settings||settings.querySelector('.auth-session'))return;
  const user=await getVerifiedUser();if(!user)return;
  const kakaoLinked=user.identities?.some(identity=>identity.provider==='kakao');
  const row=document.createElement('div');row.className='auth-session';row.innerHTML=`<div><b>${user.email||'이메일 계정'} 로그인됨</b><small>${kakaoLinked?'카카오 계정도 연결되어 있어요.':'카카오를 연결하면 다음부터 더 빠르게 로그인할 수 있어요.'}</small></div><div class="auth-session__actions">${kakaoLinked?'':'<button type="button" data-link-kakao>카카오 연결</button>'}<button type="button" data-sign-out>로그아웃</button></div>`;
  row.querySelector('[data-link-kakao]')?.addEventListener('click',async()=>{const{error}=await linkKakaoIdentity('/settings');if(error)alert('카카오 계정을 연결하지 못했어요. 잠시 후 다시 시도해주세요.')});
  row.querySelector('[data-sign-out]').onclick=async()=>{await supabase.auth.signOut();localStorage.removeItem('reelation-state');location.href='/'};settings.after(row);
}
const observer=new MutationObserver(decorateSession);if(app)observer.observe(app,{childList:true,subtree:true});decorateSession();
supabase.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){window.__REELATION_AUTH_USER_ID__=null;document.documentElement.dataset.auth='anonymous'}else if(session?.user){window.__REELATION_AUTH_USER_ID__=session.user.id;document.documentElement.dataset.auth='authenticated'}});
