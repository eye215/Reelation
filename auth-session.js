import{supabase,getVerifiedUser,linkKakaoIdentity}from'./supabase-client.js?v=public-invite-103';
const app=document.querySelector('#app');
const identityDismissKey=userId=>`reelation-kakao-link-dismissed:${userId}`;
async function offerKakaoLink(user){
  const providers=new Set((user.identities||[]).map(identity=>identity.provider));
  if(providers.has('kakao')||!providers.has('email')||localStorage.getItem(identityDismissKey(user.id))||document.querySelector('.auth-link-offer'))return;
  const offer=document.createElement('aside');offer.className='auth-link-offer';offer.setAttribute('aria-live','polite');offer.innerHTML=`<div><b>다음에는 카카오로 바로 들어올까요?</b><small>현재 이메일 계정에 카카오 로그인을 연결하면 사주정보와 Reelation이 그대로 이어져요.</small></div><div><button type="button" data-connect-kakao>카카오 연결</button><button type="button" data-dismiss-link>나중에</button></div>`;
  document.body.append(offer);requestAnimationFrame(()=>offer.classList.add('is-visible'));
  offer.querySelector('[data-connect-kakao]').onclick=async()=>{const button=offer.querySelector('[data-connect-kakao]');button.disabled=true;button.textContent='카카오 연결 중…';const{error}=await linkKakaoIdentity(location.pathname+location.search);if(error){button.disabled=false;button.textContent='다시 연결';offer.querySelector('small').textContent='연결을 시작하지 못했어요. 잠시 후 다시 시도해주세요.'}};
  offer.querySelector('[data-dismiss-link]').onclick=()=>{localStorage.setItem(identityDismissKey(user.id),'1');offer.classList.remove('is-visible');setTimeout(()=>offer.remove(),220)};
}
async function decorateSession(){
  const user=await getVerifiedUser();if(!user)return;
  offerKakaoLink(user);
  const settings=document.querySelector('.page .rank-card');if(!settings||settings.querySelector('.auth-session'))return;
  const kakaoLinked=user.identities?.some(identity=>identity.provider==='kakao');
  const row=document.createElement('div');row.className='auth-session';row.innerHTML=`<div><b>${user.email||'이메일 계정'} 로그인됨</b><small>${kakaoLinked?'카카오 계정도 연결되어 있어요.':'카카오를 연결하면 다음부터 더 빠르게 로그인할 수 있어요.'}</small></div><div class="auth-session__actions">${kakaoLinked?'':'<button type="button" data-link-kakao>카카오 연결</button>'}<button type="button" data-sign-out>로그아웃</button></div>`;
  row.querySelector('[data-link-kakao]')?.addEventListener('click',async()=>{const{error}=await linkKakaoIdentity('/settings');if(error)alert('카카오 계정을 연결하지 못했어요. 잠시 후 다시 시도해주세요.')});
  row.querySelector('[data-sign-out]').onclick=async()=>{await supabase.auth.signOut();localStorage.removeItem('reelation-state');location.href='/'};settings.after(row);
}
const observer=new MutationObserver(decorateSession);if(app)observer.observe(app,{childList:true,subtree:true});decorateSession();
supabase.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){window.__REELATION_AUTH_USER_ID__=null;document.documentElement.dataset.auth='anonymous'}else if(session?.user){window.__REELATION_AUTH_USER_ID__=session.user.id;document.documentElement.dataset.auth='authenticated';offerKakaoLink(session.user)}});
