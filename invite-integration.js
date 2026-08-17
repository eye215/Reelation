import{supabase,getVerifiedUser,signInWithMagicLink,signInWithKakao,invokePublicFunction}from'./supabase-client.js?v=cdn-fallback-96';

const app=document.querySelector('#app');
const tokenFromPath=()=>location.pathname.match(/^\/reel\/([A-Za-z0-9_-]{40,128})\/?$/)?.[1]||null;
const errorCopy={INVALID_TOKEN:'링크 형식이 올바르지 않아요.',INVITE_NOT_FOUND:'존재하지 않거나 변경된 초대 링크예요.',INVITE_DISABLED:'초대가 종료된 링크예요.',INVITE_EXPIRED:'사용 기간이 만료된 링크예요.'};
const showToast=message=>{const toast=document.querySelector('#toast');if(!toast)return;toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1800)};
const copyText=async value=>{try{await navigator.clipboard.writeText(value);return true}catch{const input=document.createElement('textarea');input.value=value;input.readOnly=true;input.style.position='fixed';input.style.opacity='0';document.body.append(input);input.select();let copied=false;try{copied=document.execCommand('copy')}catch{}input.remove();return copied}};
const functionErrorCode=async(data,error,fallback)=>{if(data?.error)return data.error;try{const payload=await error?.context?.clone?.().json();if(payload?.error)return payload.error}catch{}return fallback};

function showOwnerLogin(card,status,copy){
  if(card.querySelector('.owner-login'))return;
  copy.disabled=true;
  const panel=document.createElement('div');panel.className='owner-login';
  panel.innerHTML='<strong>내 초대 링크를 만들려면 저장해주세요.</strong><p>카카오 또는 이메일 계정으로 영화 소유권과 출연진 관리를 연결해요.</p><button type="button" data-kakao>카카오로 저장하기</button><input type="email" inputmode="email" autocomplete="email" placeholder="name@example.com" aria-label="로그인 이메일" required><button type="button" data-email>이메일 링크로 저장하기</button>';
  panel.querySelector('[data-kakao]').onclick=async()=>{const{error}=await signInWithKakao('/invite');if(error)status.textContent='카카오 로그인을 시작하지 못했어요.'};
  panel.querySelector('[data-email]').onclick=async()=>{const{error,code}=await signInWithMagicLink(panel.querySelector('input').value,'/invite');if(code==='INVALID_EMAIL')status.textContent='이메일 주소를 정확히 입력해주세요.';else if(error)status.textContent='로그인 링크를 보내지 못했어요.';else status.textContent='메일을 보냈어요. 받은 편지함의 링크를 눌러주세요.'};
  card.append(panel);
}

const setInviteUrl=(urlBox,value)=>{
  const label=urlBox.querySelector('span');
  if(label)label.textContent=value;else urlBox.textContent=value;
};

const createServerInvite=async(board,status,copy,share,urlBox)=>{
  copy.disabled=true;share.disabled=true;copy.textContent='링크 만드는 중…';
  const{data,error}=await supabase.functions.invoke('create-invite',{body:{boardId:board.id}});
  if(error||!data?.url){status.textContent='링크를 만들지 못했어요. 잠시 후 다시 시도해주세요.';copy.disabled=false;copy.textContent='다시 시도';return null}
  const invite={url:data.url,expiresAt:data.expiresAt};
  sessionStorage.setItem(`reelation-owner-invite:${board.id}`,JSON.stringify(invite));
  setInviteUrl(urlBox,invite.url);
  status.textContent=`${new Date(invite.expiresAt).toLocaleDateString('ko-KR')}까지 사용할 수 있어요.`;
  copy.disabled=false;share.disabled=false;copy.textContent='링크 복사';
  return invite;
};

async function connectOwnerInvite(){
  if(location.pathname!=='/invite')return;
  const copy=document.querySelector('#copy'),share=document.querySelector('#share'),toggle=document.querySelector('#toggle'),urlBox=document.querySelector('#inviteUrl'),card=document.querySelector('.r16-link-card, .invite-card');
  if(!copy||!share||!toggle||!urlBox||!card||copy.dataset.serverBound||copy.dataset.authWaiting)return;
  copy.dataset.serverBound='true';
  const status=card.querySelector('.server-invite-status')||document.createElement('p');status.className='server-invite-status';status.textContent='서버 연결 상태를 확인하고 있어요.';if(!status.isConnected)card.append(status);
  const user=await getVerifiedUser();
  if(!user){status.textContent='Owner 로그인이 필요해요.';showOwnerLogin(card,status,copy);return}
  const{data:board,error:boardError}=await supabase.from('casting_boards').select('id,invite_enabled').eq('owner_user_id',user.id).maybeSingle();
  if(boardError||!board){const retries=Number(copy.dataset.retries||0)+1;copy.dataset.retries=String(retries);if(retries>=5){status.textContent='보드를 연결하지 못했어요. 페이지를 새로고침해주세요.';copy.disabled=true;return}status.textContent='Reelation 보드를 생성하고 있어요.';delete copy.dataset.serverBound;copy.dataset.authWaiting='true';setTimeout(()=>{delete copy.dataset.authWaiting;connectOwnerInvite()},800);return}
  card.querySelector('.owner-login')?.remove();
  let invite=null;
  try{invite=JSON.parse(sessionStorage.getItem(`reelation-owner-invite:${board.id}`)||'null')}catch{}
  const syncControls=enabled=>{
    toggle.classList.toggle('is-open',enabled);toggle.setAttribute('aria-label',`초대 ${enabled?'끄기':'켜기'}`);
    copy.disabled=!enabled;share.disabled=!enabled;urlBox.disabled=!enabled;
    const headState=document.querySelector('.r16-invite-head>i'),linkTitle=document.querySelector('.r16-link-card h2'),controlTitle=document.querySelector('.r16-control b'),controlCopy=document.querySelector('.r16-control small');
    if(headState){headState.textContent=enabled?'OPEN':'CLOSED';headState.classList.toggle('is-open',enabled)}
    if(linkTitle)linkTitle.textContent=enabled?'초대 링크가 열려 있어요.':'현재 초대를 받지 않고 있어요.';
    if(controlTitle)controlTitle.textContent=enabled?'새로운 참여 허용 중':'새로운 참여 차단됨';
    if(controlCopy)controlCopy.textContent=enabled?'링크를 받은 친구가 참여할 수 있어요.':'기존 링크로 들어와도 참여할 수 없어요.';
    try{const saved=JSON.parse(localStorage.getItem('reelation-state')||'null');if(saved){saved.invite=enabled;localStorage.setItem('reelation-state',JSON.stringify(saved))}}catch{}
  };
  syncControls(board.invite_enabled);
  if(board.invite_enabled){
    if(invite?.url&&(!invite.expiresAt||new Date(invite.expiresAt)>new Date())){setInviteUrl(urlBox,invite.url);status.textContent=`${new Date(invite.expiresAt).toLocaleDateString('ko-KR')}까지 사용할 수 있어요.`}
    else invite=await createServerInvite(board,status,copy,share,urlBox);
  }else status.textContent='서버에서 새로운 참여를 차단하고 있어요.';
  const copyInvite=async()=>{if(!invite?.url)return;const copied=await copyText(invite.url);showToast(copied?'친구 초대 링크를 복사했어요':'링크를 길게 눌러 복사해주세요')};
  copy.onclick=copyInvite;urlBox.onclick=copyInvite;
  share.onclick=async()=>{if(!invite?.url)return;if(navigator.share){try{await navigator.share({title:'Reelation 초대',text:'내 영화에서 당신은 어떤 사람일까요?',url:invite.url})}catch(error){if(error?.name!=='AbortError')await copyInvite()}}else await copyInvite()};
  toggle.onclick=async()=>{
    toggle.disabled=true;const next=!toggle.classList.contains('is-open');status.textContent=next?'새로운 초대 링크를 여는 중이에요.':'기존 초대 링크를 닫는 중이에요.';
    if(!next){
      const{error:disableError}=await supabase.from('invites').update({status:'DISABLED'}).eq('board_id',board.id).eq('status','ACTIVE');
      if(disableError){status.textContent='기존 링크를 닫지 못했어요. 다시 시도해주세요.';toggle.disabled=false;return}
      const{error:boardUpdateError}=await supabase.from('casting_boards').update({invite_enabled:false}).eq('id',board.id).eq('owner_user_id',user.id);
      if(boardUpdateError){status.textContent='초대 상태를 바꾸지 못했어요. 다시 시도해주세요.';toggle.disabled=false;return}
      sessionStorage.removeItem(`reelation-owner-invite:${board.id}`);invite=null;syncControls(false);status.textContent='기존 링크 접근을 서버에서 차단했어요.';
    }else{
      invite=await createServerInvite(board,status,copy,share,urlBox);
      if(!invite){syncControls(false);toggle.disabled=false;return}
      const{error:boardUpdateError}=await supabase.from('casting_boards').update({invite_enabled:true}).eq('id',board.id).eq('owner_user_id',user.id);
      if(boardUpdateError){await supabase.from('invites').update({status:'DISABLED'}).eq('board_id',board.id).eq('status','ACTIVE');sessionStorage.removeItem(`reelation-owner-invite:${board.id}`);invite=null;syncControls(false);status.textContent='초대 상태를 바꾸지 못했어요. 다시 시도해주세요.';toggle.disabled=false;return}
      syncControls(true);
    }
    toggle.disabled=false;
  };
}

async function resolveVisitorInvite(){
  const token=tokenFromPath();
  let cachedMeta=null;try{cachedMeta=JSON.parse(sessionStorage.getItem('reelation-invite-meta')||'null')}catch{}
  if(!token)return;
  const{data,error}=await invokePublicFunction('resolve-invite',{token});
  if(error||!data?.valid){
    sessionStorage.removeItem('reelation-valid-invite');
    sessionStorage.removeItem('reelation-invite-meta');
    const code=await functionErrorCode(data,error,'INVITE_NOT_FOUND');
    app.innerHTML=`<main class="server-invite-error"><span>Reelation.</span><h1>${errorCopy[code]||'초대 링크를 확인할 수 없어요.'}</h1><p>링크를 보낸 친구에게 새로운 초대 링크를 요청해주세요.</p><button onclick="location.href='/'">Reelation 둘러보기</button></main>`;return;
  }
  // A valid invite opens the owner's movie immediately. Authentication is
  // intentionally deferred until the visitor presses the participation CTA.
  const saved=JSON.parse(localStorage.getItem('reelation-state')||'null');
  if(saved){
    saved.board={...(saved.board||{}),publicId:token,id:data.boardId||saved.board?.id};
    saved.invite=true;
    saved.owner={...(saved.owner||{}),nickname:data.ownerNickname};
    saved.cast=[];
    localStorage.setItem('reelation-state',JSON.stringify(saved));
  }
  const publicId=data.publicId;
  const[{data:reel},{data:cast}]=publicId?await Promise.all([
    supabase.from('public_reels').select('public_id,owner_nickname,title,hero_image_key,cast_count,primary_genre,theme_key,character_type,tagline,poster_image_key').eq('public_id',publicId).maybeSingle(),
    supabase.from('public_cast_entries').select('cast_member_public_id,nickname,influence_score,influence_rank,image_key').eq('public_id',publicId).order('influence_rank',{ascending:true}),
  ]):[{data:null},{data:[]}];
  const publicMeta={inviteToken:token,publicId,ownerNickname:reel?.owner_nickname||data.ownerNickname,title:reel?.title||data.title,heroImageKey:reel?.hero_image_key||null,posterImageKey:reel?.poster_image_key||null,castCount:reel?.cast_count??data.castCount??0,primaryGenre:reel?.primary_genre||null,themeKey:reel?.theme_key||null,characterType:reel?.character_type||null,tagline:reel?.tagline||null,cast:Array.isArray(cast)?cast:[],validatedAt:Date.now()};
  sessionStorage.setItem('reelation-valid-invite',token);
  sessionStorage.setItem('reelation-invite-meta',JSON.stringify(publicMeta));
  if(cachedMeta?.inviteToken===token&&cachedMeta?.publicId){window.dispatchEvent(new CustomEvent('reelation-invite-resolved',{detail:publicMeta}));return}
  location.reload();
}

function connectGuestSubmission(){
  const token=tokenFromPath();if(!token||sessionStorage.getItem('reelation-valid-invite')!==token)return;
  const form=document.querySelector('#visitorJoinForm, #visitorForm');if(!form||form.dataset.serverBound)return;
  form.dataset.serverBound='true';const localSubmit=form.onsubmit;
  form.onsubmit=async event=>{
    event.preventDefault();
    const user=await getVerifiedUser();
    if(!user){
      if(window.confirm('카카오 로그인으로 저장할까요?\n취소를 누르면 이메일 링크를 선택할 수 있어요.')){const{error}=await signInWithKakao(location.pathname+'#visitorJoin');if(error)showToast('카카오 로그인을 시작하지 못했어요.');return}
      const email=window.prompt('로그인 링크를 받을 이메일을 입력해주세요.');if(!email)return;const{error,code}=await signInWithMagicLink(email,location.pathname+'#visitorJoin');if(code==='INVALID_EMAIL')showToast('이메일 주소를 정확히 입력해주세요.');else if(error)showToast('로그인 링크를 보내지 못했어요. 다시 시도해주세요.');else showToast('이메일로 로그인 링크를 보냈어요.');
      return;
    }
    const fields=new FormData(form),unknown=(document.querySelector('#visitorJoinUnknown')||document.querySelector('#visitorUnknown'))?.checked;
    const submit=form.querySelector('button[type="submit"]');submit.disabled=true;submit.textContent='관계를 연결하는 중…';
    const{data,error}=await supabase.functions.invoke('submit-invite-auth',{body:{token,nickname:fields.get('nickname'),birthDate:fields.get('birthDate'),birthTime:unknown?null:fields.get('birthTime'),birthTimeKnown:!unknown,gender:fields.get('gender'),consentVersion:'invite-v1'}});
    if(error||!data?.ok){const code=await functionErrorCode(data,error,'SUBMISSION_FAILED');const messages={AUTH_REQUIRED:'참여하려면 이메일 로그인이 필요해요.',DUPLICATE_PARTICIPATION:'이미 참여했어요. 기존 캐릭터를 확인해주세요.',INVITE_INVALID:'초대가 종료되었거나 만료됐어요.',INVALID_TOKEN:'초대 링크를 확인해주세요.',INVALID_NICKNAME:'닉네임을 확인해주세요.',INVALID_BIRTH_DATE:'생년월일을 확인해주세요.',INVALID_BIRTH_TIME:'출생 시간을 확인해주세요.',INVALID_GENDER:'성별을 확인해주세요.',CONSENT_REQUIRED:'개인정보 이용 동의가 필요해요.'};submit.disabled=false;submit.textContent='다시 시도';showToast(messages[code]||'저장하지 못했어요. 다시 시도해주세요.');return}
    form.dataset.castMemberId=data.castMemberId;
    form.dataset.participationId=data.participationId;
    await localSubmit?.call(form,event);
    showToast('친구의 Board에 안전하게 참여했어요');
  };
}

const connect=()=>{connectOwnerInvite();connectGuestSubmission()};const observer=new MutationObserver(connect);observer.observe(app,{childList:true,subtree:true});
connect();resolveVisitorInvite();
