/* Other local planning tools. */
(() => {
  'use strict';
  const M=LeaseLtvModel,dates=AffordabilityModel,$=id=>document.getElementById(id),KEY='estate-basics-others-v1';
  const money=v=>new Intl.NumberFormat('en-SG',{style:'currency',currency:'SGD',maximumFractionDigits:0}).format(v);
  const number=v=>new Intl.NumberFormat('en-SG',{maximumFractionDigits:0}).format(v);
  let state=M.defaults(),seeded=false;
  try{const raw=localStorage.getItem(KEY);if(raw)state=M.cleanState(JSON.parse(raw));}catch{}
  const controls={builtYear:'ltvBuiltYear',leaseTerm:'ltvLeaseTerm',currentYear:'ltvCurrentYear',dob:'ltvDob',age:'ltvAge',ltv:'ltvLimit',price:'ltvPrice'};
  $('leaseForm').addEventListener('submit',e=>e.preventDefault());
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));$('othersSaveStatus').textContent='Saved on this device. Values remain available when you change tabs.';}catch{$('othersSaveStatus').textContent='Browser storage is unavailable. Download a backup to keep these figures.';}}
  function sync(){for(const [key,id]of Object.entries(controls))$(id).value=key==='price'&&dates.has(state.price)?number(dates.n(state.price)):key==='dob'?DobInput.format(state.dob):state[key];}
  function render(){
    const r=M.calculate(state);$('exportOthersPdf').disabled=!r.valid||r.loan===null;$('ltvRemaining').textContent=r.remaining===null?'—':number(r.remaining)+' years';
    if(state.ageAuto&&state.dob)$('ltvAge').value=r.age===null?'':r.age;
    $('ltvAgeMode').textContent=state.ageAuto&&state.dob?'Calculated from DOB as of '+(r.date||dates.today())+'.':'Manual age. Enter a DOB or use DOB age to calculate it automatically.';
    $('ltvUseDob').disabled=!state.dob;
    $('ltvResult').textContent=r.prorated===null?'—':r.prorated.toFixed(0)+'%';$('ltvMaxLoan').textContent=r.loan===null?'—':money(r.loan);
    $('ltvFullLabel').textContent='Original full loan at '+number(r.base)+'% LTV';$('ltvFullLoan').textContent=r.fullLoan===null?'—':money(r.fullLoan);
    $('ltvDifference').textContent=r.loanDifference===null?'—':money(r.loanDifference);
    $('ltvCoverage').textContent=r.coverage===null?'—':'Age '+number(r.coverage);
    const statuses={incomplete:'Enter the lease and buyer details to calculate.',full:'The estimated lease covers the youngest buyer to at least age 95. The current LTV limit applies.', 'short-lease':'Remaining lease is 20 years or less. The formula-based LTV is set to 0%.','pro-rated':'The estimated lease falls short of age 95, so your pro-rating formula applies.'};
    $('ltvStatus').textContent=statuses[r.status];$('ltvMessages').replaceChildren();for(const error of r.errors){const p=document.createElement('p');p.textContent=error;$('ltvMessages').append(p);}
    $('ltvWorking').textContent=r.prorated===null?'((Remaining lease − 20) ÷ (95 − youngest age − 20)) × current LTV':r.status==='full'?number(r.remaining)+' years + age '+number(r.age)+' = '+number(r.coverage)+'; current LTV '+number(r.base)+'% applies.':r.status==='short-lease'?'Remaining lease '+number(r.remaining)+' years ≤ 20; applied LTV 0%.':'(('+number(r.remaining)+' − 20) ÷ (95 − '+number(r.age)+' − 20)) × '+number(r.base)+'% = '+r.prorated.toFixed(0)+'%';
    $('ltvLoanWorking').textContent=r.loan===null?'Enter a property price to calculate the loan.':money(r.price)+' × '+r.prorated.toFixed(0)+'% = '+money(r.loan)+' (uses the unrounded LTV internally).';
  }
  for(const [key,id]of Object.entries(controls))$(id).addEventListener('input',()=>{state[key]=key==='dob'?DobInput.parse($(id).value):$(id).value;if(key==='currentYear')state.currentYearAuto=false;if(key==='dob')state.ageAuto=true;if(key==='age')state.ageAuto=!dates.has(state.age);render();persist();});
  $('ltvUseDob').addEventListener('click',()=>{state.ageAuto=true;render();persist();});
  $('ltvUseYear').addEventListener('click',()=>{state.currentYearAuto=true;state.currentYear=dates.today().slice(0,4);$('ltvCurrentYear').value=state.currentYear;render();persist();});
  $('ltvPrice').addEventListener('focusout',()=>{$('ltvPrice').value=dates.has(state.price)?number(dates.n(state.price)):'';});
  function importPrice(){const input=window.EstatePlannerBridge?.getInputs('hdb')||{};if(dates.has(input.buyPrice)){state.price=input.buyPrice;$('ltvPrice').value=number(dates.n(state.price));render();persist();}}
  $('ltvUsePrice').addEventListener('click',importPrice);
  document.addEventListener('estate:tab-changed',e=>{if(e.detail==='others'&&!seeded){seeded=true;if(!state.skipPlannerPrefill&&!dates.has(state.price))importPrice();render();}});
  window.EstateOthers={startFresh(){state=M.defaults();state.skipPlannerPrefill=true;seeded=true;sync();render();persist();},getState:()=>M.cleanState(state),setState(raw){state=M.cleanState(raw);sync();render();persist();}};
  function reportName(){return window.EstatePlannerBridge?.getReportName()||window.EstateAffordability?.getReportName()||'LTV Calculation';}
  function download(data,type,filename){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  $('saveOthersDevice').addEventListener('click',()=>{persist();const now=new Date();download(JSON.stringify({type:'estate-basics-ltv',version:1,savedAt:now.toISOString(),calculation:M.cleanState(state)},null,2),'application/json',PropertyPdf.filename(reportName(),now).replace('Property Planner - ','LTV Calculator - ')+'.json');$('othersSaveStatus').textContent='Calculation saved on this device and downloaded as a restore file.';});
  $('restoreOthersDevice').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2000000)throw Error();const data=JSON.parse(await file.text());if(data.type!=='estate-basics-ltv'||data.version!==1||!data.calculation||typeof data.calculation!=='object')throw Error();window.EstateOthers.setState(data.calculation);seeded=true;$('othersSaveStatus').textContent='Calculation restored and saved on this device.';}catch{$('othersSaveStatus').textContent='Unable to restore. Choose a valid saved LTV calculation JSON file.';}e.target.value='';});
  $('exportOthersPdf').addEventListener('click',()=>{
    const r=M.calculate(state);if(!r.valid||r.loan===null)return;const now=new Date(),name=reportName();
    const bytes=PropertyPdf.reportPdf({name,scenario:'Others / Pro-rated LTV Calculator',date:now.toLocaleString('en-SG',{timeZone:'Asia/Singapore'}),primaryLabel:'Pro-rated maximum loan / formula estimate',primary:money(r.loan),
      groups:[{title:'Lease and buyer assessment',rows:[{label:'Remaining lease of property',amount:number(r.remaining)+' years'},{label:'Youngest buyer age',amount:number(r.age)+' years'},{label:'Lease covers youngest buyer to',amount:'Age '+number(r.coverage)},{label:'Current LTV limit',amount:number(r.base)+'%'},{label:'Pro-rated LTV (rounded display)',amount:number(r.prorated)+'%'}]},
      {title:'Original and pro-rated loan comparison',rows:[{label:'Property price',amount:money(r.price),bold:true},{label:'Original full loan at '+number(r.base)+'% LTV',amount:money(r.fullLoan)},{label:'Pro-rated maximum loan',amount:money(r.loan),bold:true},{label:'Difference / original less pro-rated loan',amount:money(r.loanDifference),bold:true}]}],
      inputs:[{label:'Built / lease commencement year',value:state.builtYear},{label:'Original lease term',value:state.leaseTerm+' years'},{label:'Current year',value:state.currentYear},{label:'DOB of youngest buyer',value:DobInput.format(state.dob)||'Not entered'},{label:'Age mode',value:state.ageAuto&&state.dob?'Calculated from DOB':'Manual age override'}],
      notes:'Formula: ((remaining lease - 20) / (95 - youngest age - 20)) x current LTV limit. '+$('ltvWorking').textContent,
      assumptions:['This report implements the supplied lease pro-rating formula as a planning estimate. It is not a lender approval or a complete financing assessment.','Original lease defaults to 99 years. Built year is used as the estimated lease commencement year; use the actual commencement year if known.','If the lease covers the youngest buyer to age 95, the full current LTV applies. A lease of 20 years or less gives 0% under this formula.','Amounts and percentages are displayed without decimals. Loan calculations use the full unrounded pro-rating ratio.','Maximum loan = property price x pro-rated LTV. Actual financing also depends on valuation, remaining lease, age, tenure, income, lender policy and eligibility. HDB loan and CPF lease rules are separate from bank loan assessments.','Sources: HDB housing-loan guidance; CPF Board guidance on leases that do not cover the youngest buyer to age 95.']});
    download(bytes,'application/pdf',PropertyPdf.filename(name,now).replace('Property Planner - ','LTV Calculator - ')+'.pdf');
  });
  setInterval(()=>{if(state.currentYearAuto)state.currentYear=dates.today().slice(0,4);$('ltvCurrentYear').value=state.currentYear;render();},60000);
  sync();render();
})();
