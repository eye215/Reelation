import{supabase,getVerifiedUser}from'./supabase-client.js?v=auth-singleton-57';

const app=document.querySelector('#app');
const tokenFromPath=()=>location.pathname.match(/^\/reel\/([A-Za-z0-9_-]{40,128})\/?$/)?.[1]||null;
const errorCopy={INVALID_TOKEN:'링크 형식이 올바르지 않아요.',INVITE_NOT_FOUND:'존재하지 않거나 변경된 초대 링크예요.',INVITE_DISABLED:'초대가 종료된 링크예요.',INVITE_EXPIRED:'사용 기간이 만료된 링크예요.'};
const showToast=message=>{const toast=document.querySelector('#toast');if(!toast)return;toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1800)};
const copyText=async value=>{try{await navigator.clipboard.writeText(value);return true}catch{const input=document.createElement('textarea');input.value=value;input.readOnly=true;input.style.position='fixed';input.style.opacity='0';document.body.append(input);input.select();let copied=false;try{copied=document.execCommand('copy')}catch{}input.remove();return copied}};

function showOwnerLogin(card,status,copy){
  if(card.querySelector('.owner-login'))return;
  copy.disabled=true;
  const form=document.createElement('form');form.className='owner-login';
  form.innerHTML='<strong>내 초대 링크를 만들려면 로그인해주세요.</strong><p>비밀번호 없이 이메일로 로그인 링크를 보내드려요.</p><label><span>이메일</span><input type="email" name="email" autocomplete="email" required placeholder="name@example.com"></label><button type="submit">로그인 링크 받기</button>';
  form.onsubmit=async event=>{event.preventDefault();const button=form.querySelector('button'),email=new FormData(form).get('email');button.disabled=true;button.textContent='보내는 중…';const{error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:`${location.origin}/invite`}});if(error){status.textContent='로그인 메일을 보내지 못했어요. 이메일을 확인해주세요.';button.disabled=false;button.textContent='다시 보내기';return}form.innerHTML='<strong>메일을 확인해주세요.</strong><p>받은 로그인 링크를 누르면 이 화면으로 돌아와 실제 초대 링크를 만들 수 있어요.</p>';status.textContent='로그인 링크를 보냈어요.'};
  card.append(form);
}

async function connectOwnerInvite(){
  if(location.pathname!=='/invite')return;
  const copy=document.querySelector('#copy'),urlBox=document.querySelector('#inviteUrl'),card=document.querySelector('.invite-card');
  if(!copy||!urlBox||copy.dataset.serverBound||copy.dataset.authWaiting)return;
  copy.dataset.serverBound='true';
  const status=card.querySelector('.server-invite-status')||document.createElement('p');status.className='server-invite-status';status.textContent='서버 연결 상태를 확인하고 있어요.';if(!status.isConnected)card.append(status);
  const user=await getVerifiedUser();
  if(!user){status.textContent='Owner 로그인이 필요해요.';showOwnerLogin(card,status,copy);return}
  const{data:board,error:boardError}=await supabase.from('casting_boards').select('id').eq('owner_user_id',user.id).maybeSingle();
  if(boardError||!board){const retries=Number(copy.dataset.retries||0)+1;copy.dataset.retries=String(retries);if(retries>=5){status.textContent='보드를 연결하지 못했어요. 페이지를 새로고침해주세요.';copy.disabled=true;return}status.textContent='Reelation 보드를 생성하고 있어요.';delete copy.dataset.serverBound;copy.dataset.authWaiting='true';setTimeout(()=>{delete copy.dataset.authWaiting;connectOwnerInvite()},800);return}
  status.textContent='실제 초대 링크를 만들 준비가 됐어요.';
  card.querySelector('.owner-login')?.remove();
  copy.disabled=false;
  copy.textContent='실제 링크 만들기';
  copy.onclick=async()=>{
    copy.disabled=true;copy.textContent='만드는 중…';
    const{data,error}=await supabase.functions.invoke('create-invite',{body:{boardId:board.id}});
    if(error||!data?.url){status.textContent='링크를 만들지 못했어요. 잠시 후 다시 시도해주세요.';copy.disabled=false;copy.textContent='다시 시도';return}
    urlBox.textContent=data.url;status.textContent=`${new Date(data.expiresAt).toLocaleDateString('ko-KR')}까지 사용할 수 있어요.`;
    const copied=await copyText(data.url);showToast(copied?'친구 초대 링크를 복사했어요':'링크를 길게 눌러 복사해주세요');
    copy.disabled=false;copy.textContent='링크 다시 복사';copy.onclick=async()=>{const copiedAgain=await copyText(data.url);showToast(copiedAgain?'링크를 복사했어요':'링크를 길게 눌러 복사해주세요')};
  };
}

async function resolveVisitorInvite(){
  const token=tokenFromPath();if(!token||sessionStorage.getItem('reelation-valid-invite')===token)return;
  const{data,error}=await supabase.functions.invoke('resolve-invite',{body:{token}});
  if(error||!data?.valid){
    const code=data?.error||error?.context?.error||'INVITE_NOT_FOUND';
    app.innerHTML=`<main class="server-invite-error"><span>Reelation.</span><h1>${errorCopy[code]||'초대 링크를 확인할 수 없어요.'}</h1><p>링크를 보낸 친구에게 새로운 초대 링크를 요청해주세요.</p><button onclick="location.href='/'">Reelation 둘러보기</button></main>`;return;
  }
  app.innerHTML=`<main class="server-invite-entry"><header><span>Reelation.</span><small>친구의 영화에 초대받았어요</small></header><section><div class="invite-owner-dot">●</div><p>${data.ownerNickname}의 영화 · 현재 ${data.castCount}명 출연 중</p><h1>나는 이 사람의<br>이야기에서 누구일까?</h1><p class="entry-copy">생년월일을 입력하면 나의 Character Still과 두 사람의 관계 역할이 바로 나타나요.</p><button id="enterInvite">내 캐릭터 확인하기</button></section></main>`;
  document.querySelector('#enterInvite').onclick=()=>{
    const saved=JSON.parse(localStorage.getItem('reelation-state')||'null');if(saved){saved.board.publicId=token;saved.invite=true;saved.owner.nickname=data.ownerNickname;saved.cast=[];saved.authUserId=null;localStorage.setItem('reelation-state',JSON.stringify(saved))}sessionStorage.setItem('reelation-valid-invite',token);location.reload();
  };
}

function connectGuestSubmission(){
  const token=tokenFromPath();if(!token||sessionStorage.getItem('reelation-valid-invite')!==token)return;
  const form=document.querySelector('#visitorForm');if(!form||form.dataset.serverBound)return;
  form.dataset.serverBound='true';const localSubmit=form.onsubmit;
  form.onsubmit=async event=>{
    event.preventDefault();const fields=new FormData(form),unknown=document.querySelector('#visitorUnknown')?.checked;
    const submit=form.querySelector('button[type="submit"]');submit.disabled=true;submit.textContent='관계를 연결하는 중…';
    const{data,error}=await supabase.functions.invoke('submit-invite',{body:{token,nickname:fields.get('nickname'),birthDate:fields.get('birthDate'),birthTime:unknown?null:fields.get('birthTime'),birthTimeKnown:!unknown,gender:fields.get('gender'),consentVersion:'invite-v1'}});
    if(error||!data?.ok){const code=data?.error||'SUBMISSION_FAILED';const messages={DUPLICATE_PARTICIPATION:'이미 이 링크에 참여한 정보예요.',INVITE_INVALID:'초대가 종료되었거나 만료됐어요.',INVALID_BIRTH_DATE:'생년월일을 확인해주세요.',INVALID_BIRTH_TIME:'출생 시간을 확인해주세요.'};submit.disabled=false;submit.textContent='다시 시도';showToast(messages[code]||'저장하지 못했어요. 다시 시도해주세요.');return}
    form.dataset.castMemberId=data.castMemberId;await localSubmit?.call(form,event);showToast('친구의 Board에 안전하게 참여했어요');
  };
}

const connect=()=>{connectOwnerInvite();connectGuestSubmission()};const observer=new MutationObserver(connect);observer.observe(app,{childList:true,subtree:true});
connect();resolveVisitorInvite();
