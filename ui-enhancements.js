const METRICS=['attraction','stability','impact','growth','longevity','cooperation','conflict'];

function enhanceRelationshipStats(){
  if(!location.pathname.startsWith('/cast/'))return;
  const cards=[...document.querySelectorAll('.stats .stat')];
  if(cards.length!==METRICS.length)return;
  let state;
  try{state=JSON.parse(localStorage.getItem('reelation-state')||'null')}catch{return}
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
    card.insertAdjacentHTML('beforeend',`<div class="stat-visual" aria-label="${score}점, 전체 ${total}명 중 ${rank}등"><div class="stat-track"><i style="width:${Math.max(0,Math.min(100,score))}%"></i></div><span>전체 ${total}명 중 <b>#${rank}</b></span></div>`);
  });
}

const observer=new MutationObserver(enhanceRelationshipStats);
observer.observe(document.querySelector('#app'),{childList:true,subtree:true});
enhanceRelationshipStats();
