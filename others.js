/* Other local planning tools. */
(() => {
  'use strict';
  const M=LeaseLtvModel,dates=AffordabilityModel,$=id=>document.getElementById(id),KEY='estate-basics-others-v1';
  const money=v=>new Intl.NumberFormat('en-SG',{style:'currency',currency:'SGD',maximumFractionDigits:2}).format(v);
  const number=v=>new Intl.NumberFormat('en-SG',{maximumFractionDigits:2}).format(v);
  let state=M.defaults(),seeded=false;
  try{const raw=localStorage.getItem(KEY);if(raw)state=M.cleanState(JSON.parse(raw));}catch{}
  const controls={builtYear:'ltvBuiltYear',leaseTerm:'ltvLeaseTerm',currentYear:'ltvCurrentYear',dob:'ltvDob',age:'ltvAge',ltv:'ltvLimit',price:'ltvPrice'};
  $('leaseForm').addEventListener('submit',e=>e.preventDefault());
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));$('othersSaveStatus').textContent='Saved on this device. Values remain available when you change tabs.';}catch{$('othersSaveStatus').textContent='Browser storage is unavailable. Download a backup to keep these figures.';}}
  function sync(){for(const [key,id]of Object.entries(controls))$(id).value=key==='price'&&dates.has(state.price)?number(dates.n(state.price)):key==='dob'?DobInput.format(state.dob):state[key];}
  function render(){
    const r=M.calculate(state);$('ltvRemaining').textContent=r.remaining===null?'—':number(r.remaining)+' years';
    if(state.ageAuto&&state.dob)$('ltvAge').value=r.age===null?'':r.age;
    $('ltvAgeMode').textContent=state.ageAuto&&state.dob?'Calculated from DOB as of '+(r.date||dates.today())+'.':'Manual age. Enter a DOB or use DOB age to calculate it automatically.';
    $('ltvUseDob').disabled=!state.dob;
    $('ltvResult').textContent=r.prorated===null?'—':r.prorated.toFixed(2)+'%';$('ltvMaxLoan').textContent=r.loan===null?'—':money(r.loan);
    $('ltvCoverage').textContent=r.coverage===null?'—':'Age '+number(r.coverage);
    const statuses={incomplete:'Enter the lease and buyer details to calculate.',full:'The estimated lease covers the youngest buyer to at least age 95. The current LTV limit applies.', 'short-lease':'Remaining lease is 20 years or less. The formula-based LTV is set to 0%.','pro-rated':'The estimated lease falls short of age 95, so your pro-rating formula applies.'};
    $('ltvStatus').textContent=statuses[r.status];$('ltvMessages').replaceChildren();for(const error of r.errors){const p=document.createElement('p');p.textContent=error;$('ltvMessages').append(p);}
    $('ltvWorking').textContent=r.prorated===null?'((Remaining lease − 20) ÷ (95 − youngest age − 20)) × current LTV':r.status==='full'?number(r.remaining)+' years + age '+number(r.age)+' = '+number(r.coverage)+'; current LTV '+number(r.base)+'% applies.':r.status==='short-lease'?'Remaining lease '+number(r.remaining)+' years ≤ 20; applied LTV 0%.':'(('+number(r.remaining)+' − 20) ÷ (95 − '+number(r.age)+' − 20)) × '+number(r.base)+'% = '+r.prorated.toFixed(2)+'%';
    $('ltvLoanWorking').textContent=r.loan===null?'Enter a property price to calculate the loan.':money(r.price)+' × '+r.prorated.toFixed(2)+'% = '+money(r.loan)+' (uses the unrounded LTV internally).';
  }
  for(const [key,id]of Object.entries(controls))$(id).addEventListener('input',()=>{state[key]=key==='dob'?DobInput.parse($(id).value):$(id).value;if(key==='currentYear')state.currentYearAuto=false;if(key==='dob')state.ageAuto=true;if(key==='age')state.ageAuto=!dates.has(state.age);render();persist();});
  $('ltvUseDob').addEventListener('click',()=>{state.ageAuto=true;render();persist();});
  $('ltvUseYear').addEventListener('click',()=>{state.currentYearAuto=true;state.currentYear=dates.today().slice(0,4);$('ltvCurrentYear').value=state.currentYear;render();persist();});
  $('ltvPrice').addEventListener('focusout',()=>{$('ltvPrice').value=dates.has(state.price)?number(dates.n(state.price)):'';});
  function importPrice(){const input=window.EstatePlannerBridge?.getInputs('hdb')||{};if(dates.has(input.buyPrice)){state.price=input.buyPrice;$('ltvPrice').value=number(dates.n(state.price));render();persist();}}
  $('ltvUsePrice').addEventListener('click',importPrice);
  document.addEventListener('estate:tab-changed',e=>{if(e.detail==='others'&&!seeded){seeded=true;if(!dates.has(state.price))importPrice();render();}});
  window.EstateOthers={getState:()=>M.cleanState(state),setState(raw){state=M.cleanState(raw);sync();render();persist();}};
  setInterval(()=>{if(state.currentYearAuto)state.currentYear=dates.today().slice(0,4);$('ltvCurrentYear').value=state.currentYear;render();},60000);
  sync();render();
})();
