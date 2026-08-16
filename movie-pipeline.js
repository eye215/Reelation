import {supabase,getVerifiedUser} from './supabase-client.js?v=auth-global-92';

const app=document.querySelector('#app');
const statusCopy={DRAFT:'영화 제작 전',GENERATING:'포스터 제작 중',COMPLETED:'영화 공개 중',UPDATED:'새 출연진 반영됨',ARCHIVED:'보관됨'};
const showToast=message=>{const toast=document.querySelector('#toast');if(!toast)return;toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2200)};

async function getOwnerMovie(){
  const user=await getVerifiedUser();if(!user)return null;
  const{data}=await supabase.from('movies').select('id,board_id,status,current_version,title,primary_genre,character_type,tagline,generation_started_at,generation_completed_at').eq('owner_user_id',user.id).maybeSingle();
  if(!data)return null;
  const[{data:reel},{data:job}]=await Promise.all([
    supabase.from('public_reels').select('public_id,poster_image_key').eq('board_id',data.board_id).maybeSingle(),
    supabase.from('movie_generation_jobs').select('status,last_error,created_at').eq('movie_id',data.id).order('created_at',{ascending:false}).limit(1).maybeSingle()
  ]);
  return{...data,publicId:reel?.public_id||null,posterImageKey:reel?.poster_image_key||null,lastJob:job||null};
}

async function requestGeneration(movie,reason){
  const{data,error}=await supabase.functions.invoke('request-movie-generation',{body:{movieId:movie.id,reason}});
  if(error||!data?.ok)throw new Error(data?.error||'GENERATION_REQUEST_FAILED');
  return data;
}

function shareUrl(publicId){return `https://gnzcatibyrqbxxdnsdua.supabase.co/functions/v1/share-reel?publicId=${encodeURIComponent(publicId)}`}
async function shareReel(){
  const state=JSON.parse(localStorage.getItem('reelation-state')||'null'),publicId=state?.board?.publicId;
  if(!publicId)return showToast('공개 링크를 먼저 만들어주세요.');
  const url=shareUrl(publicId),title=`${state.owner?.nickname||'나'}의 Reelation`,description='이 영화에서 당신은 어떤 역할일까요?';
  if(window.Kakao?.isInitialized?.()){
    window.Kakao.Share.sendDefault({objectType:'feed',content:{title,description,imageUrl:'https://reelation.yullul.com/assets/day-stem-characters-v2.jpg',link:{mobileWebUrl:url,webUrl:url}},buttons:[{title:'내 역할 확인하기',link:{mobileWebUrl:url,webUrl:url}}]});return;
  }
  if(navigator.share){try{await navigator.share({title,text:description,url});return}catch(error){if(error?.name==='AbortError')return}}
  await navigator.clipboard.writeText(url);showToast('카카오톡에 붙여넣을 공유 링크를 복사했어요.');
}

async function enhanceOwnerMovie(){
  if(location.pathname!=='/board'||document.querySelector('.movie-job-panel'))return;
  const hero=document.querySelector('.owner-movie-hero');if(!hero)return;
  const movie=await getOwnerMovie();if(!movie)return;
  if(movie.posterImageKey){
    const{data}=supabase.storage.from('movie-posters').getPublicUrl(movie.posterImageKey);
    const art=hero.querySelector('.owner-character-still>.cast-art');
    if(art&&data?.publicUrl){art.style.backgroundImage=`url('${data.publicUrl}')`;art.classList.add('generated-movie-poster');hero.classList.add('has-generated-poster')}
  }
  const failed=movie.lastJob?.status==='FAILED';
  const panel=document.createElement('section');panel.className=`movie-job-panel status-${movie.status.toLowerCase()}`;
  if(failed)panel.classList.add('status-failed');
  const detail=movie.status==='GENERATING'?'시나리오와 포스터를 만들고 있어요. 화면을 닫아도 계속 진행됩니다.':failed?'제작을 완료하지 못했어요. 기존 화면은 그대로 유지됩니다.':movie.status==='UPDATED'?'기존 영화는 유지돼요. 원할 때 새 버전을 만들 수 있어요.':movie.posterImageKey?`Movie v${movie.current_version} · 포스터 저장 완료`:`Movie v${movie.current_version||0}`;
  panel.innerHTML=`<div><span class="movie-job-dot"></span><div><b>${failed?'포스터 제작 실패':statusCopy[movie.status]||movie.status}</b><small>${detail}</small></div></div><div class="movie-job-actions">${movie.status!=='GENERATING'?`<button type="button" data-generate>${failed?'다시 제작하기':movie.current_version?'새로운 영화 만들기':'내 영화 제작하기'}</button>`:'<span>GENERATING…</span>'}<button type="button" data-share>공유</button></div>`;
  hero.after(panel);
  panel.querySelector('[data-share]').onclick=shareReel;
  const generate=panel.querySelector('[data-generate]');
  if(generate)generate.onclick=async()=>{generate.disabled=true;generate.textContent='제작 요청 중…';try{const result=await requestGeneration(movie,movie.current_version?'MANUAL_REGENERATE':'INITIAL');showToast(result.cached?'완성된 포스터를 불러왔어요.':'영화 제작을 시작했어요.');location.reload()}catch{generate.disabled=false;generate.textContent='다시 시도';showToast('영화 제작을 시작하지 못했어요.')}};
  if(movie.status==='GENERATING')setTimeout(()=>location.reload(),12000);
}

const observer=new MutationObserver(enhanceOwnerMovie);if(app)observer.observe(app,{childList:true,subtree:true});enhanceOwnerMovie();
