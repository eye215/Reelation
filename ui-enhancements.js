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

const enhance=()=>{enhanceRouteSurface();enhanceRelationshipStats();enhanceRankLabels()};
const observer=new MutationObserver(enhance);
observer.observe(document.querySelector('#app'),{childList:true,subtree:true});
enhance();
