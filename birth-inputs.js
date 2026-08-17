import{lunarToSolar}from'./engine.js?v=lunar-104';
const currentYear=new Date().getFullYear();
const option=(value,label,selected=false)=>`<option value="${value}"${selected?' selected':''}>${label}</option>`;

function enhanceBirthInput(input){
  if(input.dataset.selectEnhanced)return;
  input.dataset.selectEnhanced='true';
  const initial=/^(\d{4})-(\d{2})-(\d{2})$/.exec(input.value||'');
  const years=Array.from({length:currentYear-1929},(_,index)=>currentYear-index);
  const wrap=document.createElement('div');
  wrap.className='birth-date-selects';
  wrap.innerHTML=`<select data-birth-year required aria-label="태어난 연도">${option('','연도')}${years.map(year=>option(year,`${year}년`,Number(initial?.[1])===year)).join('')}</select><select data-birth-month required aria-label="태어난 월">${option('','월')}${Array.from({length:12},(_,index)=>index+1).map(month=>option(month,`${month}월`,Number(initial?.[2])===month)).join('')}</select><select data-birth-day required aria-label="태어난 일"></select>`;
  const existingCalendar=input.form?.querySelector('select[name="calendar"],select[name="calendarType"]');
  let calendar=null;
  if(existingCalendar){existingCalendar.disabled=false;const lunar=existingCalendar.querySelector('option[value="LUNAR"]');if(lunar){lunar.disabled=false;lunar.textContent='음력'}}else{calendar=document.createElement('label');calendar.className='birth-calendar-wrap';calendar.innerHTML='<span>달력 기준</span><select class="birth-calendar-select" name="calendarType" required><option value="SOLAR">양력</option><option value="LUNAR">음력</option></select>'}
  input.type='hidden';
  input.required=false;
  input.insertAdjacentElement('afterend',wrap);
  if(calendar)wrap.insertAdjacentElement('afterend',calendar);
  const year=wrap.querySelector('[data-birth-year]'),month=wrap.querySelector('[data-birth-month]'),day=wrap.querySelector('[data-birth-day]');
  const syncDays=()=>{
    const selected=Number(day.value||initial?.[3]||0),count=year.value&&month.value?new Date(Number(year.value),Number(month.value),0).getDate():31;
    day.innerHTML=option('','일')+Array.from({length:count},(_,index)=>index+1).map(value=>option(value,`${value}일`,value===selected)).join('');
    syncValue();
  };
  const syncValue=()=>{input.value=year.value&&month.value&&day.value?`${year.value}-${String(month.value).padStart(2,'0')}-${String(day.value).padStart(2,'0')}`:''};
  year.addEventListener('change',syncDays);month.addEventListener('change',syncDays);day.addEventListener('change',syncValue);syncDays();
}

const enhanceAll=()=>document.querySelectorAll('input[type="date"][name="birthDate"]:not([data-select-enhanced])').forEach(enhanceBirthInput);
new MutationObserver(enhanceAll).observe(document.querySelector('#app'),{childList:true,subtree:true});
enhanceAll();
document.addEventListener('submit',event=>{const form=event.target;if(!(form instanceof HTMLFormElement))return;const date=form.querySelector('input[name="birthDate"]'),calendar=form.querySelector('select[name="calendarType"],select[name="calendar"]');if(!date||calendar?.value!=='LUNAR')return;try{date.dataset.lunarBirthDate=date.value;date.value=lunarToSolar(date.value);calendar.value='SOLAR'}catch{event.preventDefault();event.stopImmediatePropagation();calendar.setCustomValidity('입력한 음력 날짜를 확인해주세요.');calendar.reportValidity();setTimeout(()=>calendar.setCustomValidity(''),0)}},true);
