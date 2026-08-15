import{calculateSaju}from'./engine.js?v=saju-12';

const METRICS=['attraction','stability','impact','growth','longevity','cooperation','conflict'];
const imageFor=person=>{
  const character=person.analysis?.character||calculateSaju({...person,birthTimeKnown:person.birthTime!=='unknown'});
  const index=character.dayPillarIndex;
  const gender=person.gender==='MALE'?'male':'female';
  return`/assets/pillars/${index}-${gender}.jpg`;
};
const readState=()=>{try{return JSON.parse(localStorage.getItem('reelation-state')||'null')}catch{return null}};
const rankLabel=(rank,total)=>`${total}명 중 ${rank}위 <small>(상위 ${Math.ceil(rank/Math.max(total,1)*100)}%)</small>`;
const withPoint=value=>`${Math.round(Number(value))}점`;
const ROLE_KO={TURNING_POINT:'인생 전환점',LIFELONG_ALLY:'평생 조력자',GROWTH_CATALYST:'성장 촉진자',RIVAL:'라이벌',SCENE_STEALER:'씬스틸러',HIDDEN_HELPER:'숨은 조력자',LONG_TERM_PRESENCE:'오래 남는 사람',STRONG_IMPRINT:'강렬한 흔적',WILDCARD:'변수',FINAL_BOSS:'최종보스'};
const GENRE_KO={ROMANCE:'로맨스',ROMANTIC_COMEDY:'로맨틱 코미디',MELODRAMA:'멜로',NOIR:'느와르',PSYCHOLOGICAL_THRILLER:'심리 스릴러',HEALING_DRAMA:'힐링 드라마',GROWTH_DRAMA:'성장 드라마',MYSTERY:'미스터리',FANTASY:'판타지'};
const topic=name=>{const last=name.charCodeAt(name.length-1);return last>=0xac00&&last<=0xd7a3&&(last-0xac00)%28?`${name}은`:`${name}는`};
const relationKeyword=person=>{const s=person.analysis.scores;return s.growth>=70?'성장':s.stability>=70?'편안함':s.conflict>=70?'긴장':s.impact>=75?'강한 영향':'호기심'};

function enhanceNavigation(){
  const labels=[['/board','BOARD'],['/cast','PEOPLE'],['/ranking','DISCOVER'],['/settings','MY']];
  document.querySelectorAll('.bottomnav .navitem').forEach(button=>{const target=labels.find(([path])=>button.dataset.go===path);if(target){const icon=button.querySelector('i')?.outerHTML||'';button.innerHTML=`${icon}${target[1]}`}});
}

function enhanceBoardMap(){
  if(location.pathname!=='/board'&&location.pathname!=='/')return;
  const state=readState(),page=document.querySelector('.reel-page');
  if(!state||!page||page.querySelector('.relation-board-head'))return;
  const groups=[
    {title:'나를 성장시키는 사람',roles:['TURNING_POINT','GROWTH_CATALYST','RIVAL','FINAL_BOSS']},
    {title:'마음이 편해지는 사람',roles:['LIFELONG_ALLY','HIDDEN_HELPER','LONG_TERM_PRESENCE']},
    {title:'묘하게 신경 쓰이는 사람',roles:['SCENE_STEALER','STRONG_IMPRINT','WILDCARD']},
  ].map(group=>({...group,people:state.cast.filter(person=>group.roles.includes(person.analysis.lifeRole))}));
  const assigned=new Set(groups.flatMap(group=>group.people.map(person=>person.id)));
  groups.push({title:'더 알아가고 싶은 사람',people:state.cast.filter(person=>!assigned.has(person.id))});
  const visible=groups.filter(group=>group.people.length);
  page.insertAdjacentHTML('afterbegin',`<section class="relation-board-head"><div><h1>내 관계 보드</h1><p>주변 ${state.cast.length}명과의 관계가 모였어요.</p></div><button data-go="/invite">친구 초대</button></section><section class="relation-self"><img src="${imageFor(state.owner)}" alt="${state.owner.nickname} 프로필"><div><span>나를 중심으로</span><b>${state.owner.nickname}</b><small>관계 지도의 시작점</small></div></section><section class="relationship-overview"><div class="overview-title"><b>내 주변에는</b><span>사람이 늘수록 관계의 모양이 선명해져요.</span></div><div class="overview-list">${visible.map(group=>`<div><span>${group.title}</span><b>${group.people.length}</b></div>`).join('')}</div></section>`);
  const castHead=page.querySelector('.casting-stage')?.previousElementSibling;
  if(castHead){castHead.querySelector('h2').textContent='내 사람들';castHead.querySelector('.eyebrow')?.remove()}
  document.querySelectorAll('.casting-card[data-go]').forEach(card=>{
    const person=state.cast.find(item=>card.dataset.go===`/cast/${item.id}`);if(!person||card.querySelector('.relationship-role'))return;
    const info=card.querySelector('div:last-child');info?.insertAdjacentHTML('beforeend',`<span class="relationship-role">${ROLE_KO[person.analysis.lifeRole]||'관계 탐색'} · ${relationKeyword(person)}</span>`);
  });
  const stage=page.querySelector('.casting-stage');
  stage?.insertAdjacentHTML('afterend',`<section class="relationship-clusters"><h2>관계별로 보기</h2>${visible.map(group=>`<button><span>${group.title}</span><b>${group.people.map(person=>person.nickname).join(' · ')}</b><i>${group.people.length}</i></button>`).join('')}</section>`);
  const rankingHead=page.querySelector('.ranking-section .section-head h2');if(rankingHead)rankingHead.textContent='관계 인사이트';
}

function enhanceNarrative(){
  if(!location.pathname.startsWith('/cast/'))return;
  const section=document.querySelector('.narrative');
  if(!section||section.dataset.expanded)return;
  const state=readState(),member=state?.cast?.find(person=>person.id===location.pathname.split('/')[2]);
  if(!member)return;
  const s=member.analysis.scores,role=ROLE_KO[member.analysis.lifeRole]||member.analysis.lifeRole,genre=GENRE_KO[member.analysis.relationshipGenre]||member.analysis.relationshipGenre,name=member.nickname;
  const closeness=s.stability>=65?'서로의 반응을 확인하고 천천히 안전한 거리를 좁혀 가는':'쉽게 익숙해지기보다 몇 번의 탐색과 확인을 거쳐 거리를 조율하는';
  const expression=s.attraction>=70?'말보다 시선과 반응이 먼저 움직이고, 작은 변화도 빠르게 알아차리는':'감정을 크게 드러내기보다 대화의 맥락과 행동으로 마음을 확인하는';
  const tension=s.conflict>=70?'서로의 속도와 기대가 어긋날 때 긴장이 선명해진다. 한쪽이 답을 서두르면 다른 쪽은 생각할 공간을 확보하려 하고, 그 차이가 침묵이나 날카로운 말로 번질 수 있다.':'큰 충돌보다는 표현의 온도 차이가 작은 오해를 만든다. 괜찮다고 넘긴 감정이 뒤늦게 드러날 수 있어, 짐작보다 짧고 분명한 확인이 필요한 관계다.';
  const change=s.growth>=70?'이 사람 앞에서는 익숙한 선택을 반복하기보다 새로운 방식으로 반응해 보게 된다. 상대는 정답을 대신 주기보다 스스로 기준을 세우게 만들고, 그 과정에서 관계뿐 아니라 자신의 욕구와 경계를 더 정확히 보게 한다.':'이 관계의 변화는 극적인 전환보다 생활 속 작은 조정으로 나타난다. 상대의 리듬을 이해하는 동안 자신의 표현 방식과 기대치를 돌아보고, 편안함을 유지하면서도 필요한 말을 꺼내는 연습을 하게 된다.';
  const future=s.longevity>=65?'앞으로도 관계를 서둘러 규정하기보다 반복되는 신뢰의 장면을 쌓는다면, 서로에게 익숙하면서도 계속 새로운 면을 발견하는 서사로 이어질 가능성이 있다.':'앞으로의 방향은 만나는 횟수보다 각 장면에서 얼마나 솔직하게 반응하는지에 달려 있다. 거리를 억지로 좁히지 않고 필요한 순간에 다시 연결될 때, 짧은 만남도 오래 남는 의미를 만들 수 있다.';
  section.dataset.expanded='true';
  section.innerHTML=`<p><strong>${topic(name)} 당신의 이야기에서 ‘${role}’의 자리에 가깝습니다.</strong> 영향력 ${Math.round(s.impact)}점과 성장성 ${Math.round(s.growth)}점이 보여주듯, 단순히 곁에 머무는 인물이라기보다 당신의 생각과 선택에 움직임을 만드는 사람입니다. 함께 있으면 평소 당연하게 여기던 기준을 다시 묻게 되고, 상대의 한마디나 태도가 다음 행동을 결정하는 계기가 되기 쉽습니다.</p><p>이 관계를 영화로 옮기면 장르는 ${genre}에 가깝습니다. ${closeness} 흐름과 ${expression} 방식이 관계의 분위기를 만듭니다. 가까워지는 순간에도 모든 의미가 한 번에 설명되지는 않으며, 대화가 끝난 뒤에야 상대의 의도나 자신의 감정을 다시 생각하게 되는 여운이 남습니다.</p><p>${tension} ${change}</p><p>${future} 이 관계의 핵심은 상대를 완전히 해석하는 데 있지 않고, 서로 다른 리듬을 읽으며 자신도 이전과 다른 선택을 배우는 데 있습니다.</p><p class="narrative-logline">“설명되지 않은 장면 사이에서, 두 사람은 서로의 다음 선택을 조금씩 바꾸어 간다.”</p>`;
}

function enhanceScoreLabels(){
  document.querySelectorAll('.mega-score,.score-big,.stat>b,.visitor-rank-row>span').forEach(el=>{
    const value=el.textContent.trim();
    if(/^\d+$/.test(value))el.textContent=withPoint(value);
  });
  document.querySelectorAll('.visitor-cast-card>div>small').forEach(el=>{
    const value=el.textContent.replace(/점/g,'').trim();
    if(/^\d+$/.test(value))el.textContent=withPoint(value);
  });
  document.querySelectorAll('.archive-card>div>span').forEach(el=>{
    el.innerHTML=el.innerHTML.replace(/(인생 영향도\s+)(\d+)(?!점)/,(_,label,score)=>`${label}${score}점`);
  });
}

function enhanceRankLabels(){
  const state=readState();
  const total=state?.cast?.length||0;
  if(!total)return;
  document.querySelectorAll('.rank-num').forEach(el=>{if(!el.textContent.includes('위'))el.textContent=`${el.textContent.trim()}위`});
  document.querySelectorAll('.visitor-cast-card>div>span,.visitor-rank-row>strong').forEach(el=>{const rank=Number(el.textContent.replace(/\D/g,''));if(rank)el.textContent=`${rank}위`});
  document.querySelectorAll('.archive-card>div>span').forEach(el=>{const rank=Number(el.textContent.match(/#(\d+)/)?.[1]);if(rank)el.innerHTML=`${rankLabel(rank,total)} · 인생 영향도 ${el.textContent.match(/영향도\s+(\d+)/)?.[1]||''}`});
  const heroRank=[...document.querySelectorAll('.detail-hero p')].find(el=>el.textContent.includes('인생 영향도'));
  if(heroRank){const match=heroRank.textContent.match(/#(\d+)|·\s*(\d+)위?/),rank=Number(match?.[1]||match?.[2]);if(rank)heroRank.innerHTML=`인생 영향도 · ${rankLabel(rank,total)}`}
  document.querySelectorAll('.film>span:last-child').forEach(el=>{
    if(el.dataset.rankLabel)return;
    const match=el.textContent.match(/(\d+)\s*\/\s*#?(\d+)/);if(!match)return;
    el.dataset.rankLabel='true';el.innerHTML=`${match[1]}점 <em>${rankLabel(Number(match[2]),total)}</em>`;
  });
}

function enhanceRouteSurface(){
  const route=location.pathname==='/cast'?'cast':location.pathname==='/ranking'?'ranking':location.pathname==='/settings'?'my':location.pathname.startsWith('/cast/')?'detail':location.pathname==='/board'?'board':'other';
  document.documentElement.dataset.route=route;
  const state=readState();
  if(!state)return;
  if(route==='cast'){
    const heading=document.querySelector('main.page>h1');if(heading)heading.textContent='내 사람들';
    const list=document.querySelector('main.page>.rank-card');
    if(list&&!list.dataset.archive){
      list.dataset.archive='true';
      list.className='character-archive';
      list.innerHTML=[...state.cast].sort((a,b)=>Number(b.analysis?.scores?.overall||0)-Number(a.analysis?.scores?.overall||0)).map((person,index)=>`<article class="archive-card" data-id="${person.id}"><img src="${imageFor(person)}" alt="${person.nickname} 캐릭터 이미지"><div><span>#${index+1} · 인생 영향도 ${Math.round(person.analysis.scores.overall)}</span><b>${person.nickname}</b><small>${person.analysis.relationshipGenre||'RELATION CHARACTER'}</small></div></article>`).join('');
      list.querySelectorAll('.archive-card').forEach(card=>card.onclick=()=>location.assign(`/cast/${card.dataset.id}`));
    }
  }
  if(route==='my'){
    const page=document.querySelector('main.page');
    const card=page?.querySelector('.rank-card');
    if(card&&!page.querySelector('.my-profile-hero')){
      page.querySelector('h1')?.insertAdjacentHTML('afterend',`<section class="my-profile-hero"><img src="${imageFor(state.owner)}" alt="${state.owner.nickname} 캐릭터 이미지"><div><span>MY CHARACTER</span><h2>${state.owner.nickname}</h2><p>내 Reelation의 주인공</p></div></section><div class="my-quick-links"><button onclick="location.href='/board'">내 보드</button><button onclick="location.href='/cast'">내 출연진</button><button onclick="location.href='/invite'">초대 링크</button></div>`);
    }
  }
}

function enhanceRelationshipStats(){
  if(!location.pathname.startsWith('/cast/'))return;
  const cards=[...document.querySelectorAll('.stats .stat')];
  if(cards.length!==METRICS.length)return;
  const state=readState();
  const id=location.pathname.split('/')[2];
  const member=state?.cast?.find(person=>person.id===id);
  if(!member)return;
  const total=state.cast.length;
  cards.forEach((card,index)=>{
    if(card.querySelector('.stat-visual'))return;
    const metric=METRICS[index];
    const score=Math.round(Number(member.analysis?.scores?.[metric]||0));
    const ordered=[...state.cast].sort((a,b)=>Number(b.analysis?.scores?.[metric]||0)-Number(a.analysis?.scores?.[metric]||0)||String(a.id).localeCompare(String(b.id)));
    const rank=ordered.findIndex(person=>person.id===id)+1;
    card.insertAdjacentHTML('beforeend',`<div class="stat-visual" aria-label="${score}점, ${total}명 중 ${rank}위"><div class="stat-track"><i style="width:${Math.max(0,Math.min(100,score))}%"></i></div><span>${total}명 중 <b>${rank}위</b><small>(상위 ${Math.ceil(rank/Math.max(total,1)*100)}%)</small></span></div>`);
  });
}

const enhance=()=>{enhanceRouteSurface();enhanceNavigation();enhanceBoardMap();enhanceRelationshipStats();enhanceRankLabels();enhanceScoreLabels();enhanceNarrative()};
const observer=new MutationObserver(enhance);
observer.observe(document.querySelector('#app'),{childList:true,subtree:true});
enhance();
