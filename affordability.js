/* Local affordability workspace. No figures are uploaded. */
(() => {
  'use strict';
  const M=AffordabilityModel,$=id=>document.getElementById(id),KEY='estate-basics-affordability-v1';
  const money=(v,decimals=0)=>new Intl.NumberFormat('en-SG',{style:'currency',currency:'SGD',maximumFractionDigits:decimals,minimumFractionDigits:decimals}).format(Math.abs(v)<.005?0:v);
  const number=v=>M.n(v).toLocaleString('en-SG',{maximumFractionDigits:2});
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const tenure=months=>months?Math.floor(months/12)+'y'+(months%12?' '+months%12+'m':''):'Unavailable';
  const pct=v=>(v*100).toFixed(1)+'%';
  let state=M.defaults(),active='planner',lastResult,plannerLoanSeen={};
  try{const saved=localStorage.getItem(KEY);if(saved)state=M.cleanState(JSON.parse(saved));}catch{}
  state=M.simplifyState(state);state.settings.term='standard';state.settings.maxMaturity='65';
  const field=(i,key,label,hint='',type='text')=>`<label class="field"><span class="field-label">${label}</span>${type==='money'?`<div class="money-wrap"><span aria-hidden="true">$</span><input inputmode="decimal" maxlength="18" data-app="${i}" data-field="${key}" id="app-${i}-${key}" value="${M.has(state.applicants[i][key])?number(state.applicants[i][key]):''}"></div>`:`<input type="${type==='dob'?'text':type}" ${type==='number'?'min="0" max="100" step="1"':''} ${type==='dob'?'data-dob-input inputmode="numeric" maxlength="11" placeholder="DDMMYYYY" autocomplete="bday"':''} data-app="${i}" data-field="${key}" id="app-${i}-${key}" value="${esc(type==='dob'?DobInput.format(state.applicants[i][key]):state.applicants[i][key])}" ${key==='name'?'maxlength="60"':''}>`}${hint?`<span class="hint">${hint}</span>`:''}</label>`;
  const select=(i,key,label,options,hint='')=>`<label class="field"><span class="field-label">${label}</span><select data-app="${i}" data-field="${key}">${options.map(([v,t])=>`<option value="${v}" ${state.applicants[i][key]===v?'selected':''}>${t}</option>`).join('')}</select>${hint?`<span class="hint">${hint}</span>`:''}</label>`;
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));$('affSaveStatus').textContent='Assessment saved on this device. It stays available across property types and tabs.';}catch{$('affSaveStatus').textContent='Browser storage is unavailable. Download a Property Planner backup to retain this assessment.';}}
  function renderApplicants(){
    $('applicants').innerHTML=state.applicants.map((a,i)=>`<section class="form-section applicant-card"><div class="applicant-title"><div><span class="eyebrow">APPLICANT ${i+1}</span><h3>${esc(a.name||'Applicant '+(i+1))}</h3></div>${state.applicants.length>1?`<button type="button" class="text-button remove-applicant" data-remove="${i}">Remove applicant</button>`:''}</div><div class="form-grid">
      ${field(i,'name','Applicant name (optional)')}${field(i,'dob','Date of birth (optional)','Enter DDMMYYYY (e.g. 05021990 → 05-Feb-1990). Age updates from DOB. Editing age overrides it until DOB is changed or restored.','dob')}
      ${field(i,'age','Age','<button type="button" class="inline-button" data-reset-age="'+i+'">Use DOB age</button>','number')}${field(i,'income','Gross monthly income','Before employee CPF and tax; exclude employer CPF.','money')}
      ${field(i,'oa','Monthly CPF allocated to OA','<span id="oa-mode-'+i+'">Automatic estimate.</span> <button type="button" class="inline-button" data-reset-oa="'+i+'">Use automatic OA</button>','money')}${field(i,'annual','Other annual income','Enter the preceding 12 months of bonuses / other annual income. Always recognised at 70% for the loan assessment.','money')}
      ${select(i,'incomeType','Monthly income type',[['fixed','Fixed (100%)'],['variable','Variable (70%)']])}
      <div class="field"><span class="field-label">Assessable income per month</span><output id="app-${i}-gross" class="calculated-output"></output><span class="hint">Monthly income + other annual income / 12.</span></div>
      </div><div class="debt-heading"><h4>Monthly debt obligations</h4><span>Enter monthly assessed repayments, not outstanding balances.</span></div><div class="form-grid">
      ${field(i,'car','Car loan','Monthly repayment.','money')}${field(i,'card','Credit card','Bank-assessed monthly obligation, not credit limit or outstanding balance.','money')}
      ${field(i,'other','Other loan','Include renovation, student and other regular loan repayments.','money')}
      </div></section>`).join('');
    $('addApplicant').disabled=state.applicants.length>=2;$('addApplicant').hidden=state.applicants.length>=2;
    renderSelection();syncApplicants();
  }
  function renderSelection(){
    const options=[['0','Applicant 1'],['1','Applicant 2'],['pair','Applicant 1 + 2']];
    if(state.applicants.length<2&&state.settings.selection!=='0')state.settings.selection='0';
    for(const id of ['affSelection'])$(id).innerHTML=options.map(([value,label])=>`<button type="button" data-select-applicants="${value}" aria-pressed="${state.settings.selection===value}" ${value!=='0'&&state.applicants.length<2?'disabled':''}>${label}</button>`).join('');
  }
  function syncApplicants(){state.applicants.forEach((a,i)=>{
    const data=M.applicantValues(a,state.settings.asOf);
    if(a.ageAuto!==false)$('app-'+i+'-age').value=data.age===null?'':data.age;
    if(a.oaAuto!==false)$('app-'+i+'-oa').value=number(data.cpf);
    $('app-'+i+'-gross').textContent=money(data.gross,2);
    $('oa-mode-'+i).textContent=a.oaAuto===false?'Manual OA override.':'Auto: 2026 CPF tables, ordinary wages only.';
  });}
  const settingIds={stressRate:'affStress',property:'affProperty',standardYears:'affStandardYears',loan:'affLoan',actualRate:'affActual'};
  function syncSettings(){for(const [key,id]of Object.entries(settingIds))$(id).value=state.settings[key];$('affName').value=state.name;$('affNotes').value=state.notes;$('affDate').value=state.settings.asOf;renderSelection();}
  function importPlannerDetails(){
    const bridge=window.EstatePlannerBridge;if(!bridge)return;
    if(!state.name)state.name=bridge.getReportName()||'';
    const type=state.settings.property,input=bridge.getInputs(type),value=M.has(input.buyLoan)?String(M.n(input.buyLoan)):'';
    if(!input._assessmentSeeded&&input.buyLoanAuto===false&&value&&value!==plannerLoanSeen[type]){
      if(!M.has(state.settings.loan)||state.settings.loan===plannerLoanSeen[type]){state.settings.loan=value;state.targets[type].loan=value;}
      plannerLoanSeen[type]=value;
    }
  }
  function shareAssessmentDetails(){const r=M.assess(state);if(!r.within)return;window.EstatePlannerBridge?.seedAssessment({type:state.settings.property,loan:r.loan,price:M.propertyBudget(r.loan,r.option.ltv).price,name:state.name});}
  function metric(label,value,hint=''){return `<article class="aff-metric"><span>${label}</span><strong>${value}</strong>${hint?`<small>${hint}</small>`:''}</article>`;}
  function renderResults(){syncApplicants();renderSelection();const r=M.assess(state);lastResult=r;state.settings.selection=r.state.settings.selection;
    $('affMetrics').innerHTML=[metric('Assessable monthly income',money(r.gross,2),'Monthly income + other annual income / 12'),metric('Selected monthly debts',money(r.debt,2),'Car, credit card and other loan repayments'),metric('Income-weighted age',r.age===null?'—':r.age.toFixed(2)+' years','Selected applicants'),metric('Estimated monthly OA',money(r.oa,2),'Selected applicants only')].join('');
    const warnings=[];if(!r.validAges)warnings.push('Enter a valid age or DOB for every selected applicant (18–100).');if(r.income<=0)warnings.push('Enter income to calculate loan capacity.');if(M.has(state.settings.stressRate)&&M.n(state.settings.stressRate)<4)warnings.push('The entered assessment rate is below the current MAS 4% floor. This assessment uses at least 4%.');if(r.stress>Math.max(4,M.n(state.settings.stressRate)))warnings.push('The quoted rate raises the effective assessment rate to '+r.stress.toFixed(2)+'%.');if(state.settings.asOf.slice(0,4)!=='2026')warnings.push('Automatic OA uses 2026 CPF tables. Enter actual OA amounts for other years.');if(r.debt>r.income*.55)warnings.push('Existing debts already exceed 55% of bank-recognised income. No TDSR headroom remains.');
    $('affWarnings').replaceChildren();for(const warning of warnings){const p=document.createElement('p');p.textContent=warning;$('affWarnings').append(p);}
    $('affComparison').innerHTML=['hdb','ec','condo'].map(type=>{const o=r.outcomes[type],label=type==='hdb'?'HDB':type==='ec'?'EC':'Condo';return `<tr data-assess-property="${type}" tabindex="0" aria-label="Open ${label} property assessment summary" aria-selected="${state.settings.property===type}" class="${state.settings.property===type?'active-property':''}"><th><button type="button" data-assess-property="${type}" aria-pressed="${state.settings.property===type}">${label}</button></th><td>${tenure(o.standard.months)}<small>${(o.standard.ltv*100).toFixed(0)}% LTV</small></td><td>${o.standard.valid?money(o.standard.capacity):'—'}</td><td>${o.standard.valid?money(M.propertyBudget(o.standard.capacity,o.standard.ltv).price):'—'}</td></tr>`;}).join('');
    const propertyLabel={hdb:'HDB',ec:'EC',condo:'Condo'}[state.settings.property];
    $('affDetailTitle').textContent=propertyLabel+' Property Assessment Summary';
    if(document.activeElement!==$('affStandardYears'))$('affStandardYears').value=r.option.months?number(r.option.months/12):'';
    if(!M.has(state.settings.loan))$('affLoan').value=r.option.valid?number(r.option.maxLoan):'';
    const budget=M.propertyBudget(r.loan,r.option.ltv);
    const status=!r.option.valid?'Enter income and age, then select an available tenure.':r.within?'Within the modelled debt-servicing and LTV limits.':'The simulated loan exceeds at least one modelled lending limit.';
    const applicants=r.indices.map(i=>'Applicant '+(i+1)+(state.applicants[i].name?' · '+state.applicants[i].name:'')).join(' + ');
    const rows=[
      ['Property',propertyLabel],['Applicants assessed',applicants],
      ['Maximum assessed loan',r.option.valid?money(r.option.maxLoan,2):'—','key'],
      ['Maximum property price',r.option.valid?money(M.propertyBudget(r.option.maxLoan,r.option.ltv).price,2):'—','key'],
      ['Selected loan amount',r.option.valid?money(r.loan,2):'—'],
      ['Property price supported by selected loan',r.option.valid?money(budget.price,2):'—'],
      ['Loan tenure',tenure(r.option.months)],['LTV limit',(r.option.ltv*100).toFixed(0)+'%'],
      ['Effective MAS Assessment rate',r.stress.toFixed(2)+'%'],
      ['Quoted / illustrative interest rate',r.actualEntered?number(M.n(state.settings.actualRate))+'%':'Not entered'],
      ['Downpayment before purchase costs',r.option.valid?money(budget.equity,2):'—'],
      ['Minimum cash downpayment',r.option.valid?money(budget.minCash,2):'—'],
      ['Monthly instalment',r.actualEntered?money(r.schedule.payment,2):'—','key'],
      ['First-month principal',r.actualEntered?money(r.schedule.rows[0]?.principal||0,2):'—'],
      ['First-month interest',r.actualEntered?money(r.schedule.rows[0]?.interest||0,2):'—'],
      ['Estimated monthly OA',money(r.oa,2)],
      ['Monthly cash gap after estimated OA',r.actualEntered?money(r.cashMonthly,2):'—']
    ];
    $('repaymentSummary').innerHTML=`<p class="summary-assessment-status ${r.within?'within':'outside'}" role="status">${esc(status)}</p><dl class="property-summary-lines">${rows.map(([label,value,kind])=>`<div class="${kind||''}"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl><p class="small muted">Property price = loan ÷ LTV, assuming price equals valuation. Downpayments exclude stamp duties and other purchase costs.</p>`;
    $('exportCombinedAssessment').disabled=!r.option.valid||!window.EstatePlannerBridge?.getReportData();$('affCombinedHint').textContent=$('exportCombinedAssessment').disabled?'Complete the assessment and enter a Property Planner calculation to enable combined export.':'Combined export is available: both current calculations will be included.';
    $('applyAffLoan').disabled=!r.within||!r.option.valid;$('exportAffPdf').disabled=!r.option.valid;if($('amortisation').open)renderAmortisation();
  }
  function renderAmortisation(){const r=lastResult;if(!r?.actualEntered||!r.option.valid){$('amortTable').innerHTML='<p class="small muted">Enter a valid loan and quoted interest rate to see the schedule.</p>';return;}$('amortTable').innerHTML=`<p class="small muted">${r.schedule.rows.length} monthly payments. Fixed illustrative rate ${M.n(state.settings.actualRate).toFixed(2)}%; the final payment may differ slightly due to rounding.</p><div class="aff-table-wrap schedule-scroll"><table><caption>Monthly amortisation schedule — ${money(r.loan)} over ${tenure(r.option.months)}</caption><thead><tr><th>Month</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead><tbody>${r.schedule.rows.map(row=>`<tr><td>${row.month}</td><td>${money(row.payment,2)}</td><td>${money(row.principal,2)}</td><td>${money(row.interest,2)}</td><td>${money(row.balance,2)}</td></tr>`).join('')}</tbody><tfoot><tr><th>Total</th><td>${money(r.schedule.totalPaid,2)}</td><td>${money(r.schedule.principalTotal,2)}</td><td>${money(r.schedule.interestTotal,2)}</td><td>${money(r.schedule.rows.at(-1)?.balance||0,2)}</td></tr></tfoot></table></div>`;}
  const tabs=['planner','affordability','others'];
  function showTab(tab){active=tabs.includes(tab)?tab:'planner';for(const value of tabs){const selected=value===active;$(value+'View').hidden=!selected;$(value+'Tab').setAttribute('aria-selected',String(selected));$(value+'Tab').tabIndex=selected?0:-1;}if(active==='affordability'){importPlannerDetails();syncSettings();renderResults();persist();}if(active==='planner')shareAssessmentDetails();document.dispatchEvent(new CustomEvent('estate:tab-changed',{detail:active}));}
  function reportData(){
    const r=M.assess(state);if(!r?.option.valid)return;const groups=[];
    groups.push({title:'Selected borrowers & debt-service position',rows:[['Gross assessable monthly income',r.gross],['Existing monthly debts',r.debt],['Estimated monthly OA',r.oa]].map(([label,value])=>({label,amount:money(value,2)}))});
    groups.push({title:'Max Loan and Max Property Price / maturity by age 65',rows:['hdb','ec','condo'].flatMap(type=>{const o=r.outcomes[type].standard,label={hdb:'HDB',ec:'EC',condo:'Condo'}[type];return [{label:label+' Max Loan / '+tenure(o.months)+' / '+(o.ltv*100).toFixed(0)+'% LTV',amount:money(o.capacity),bold:true},{label:label+' Max Property Price',amount:money(M.propertyBudget(o.capacity,o.ltv).price)}];})});
    const budget=M.propertyBudget(r.loan,r.option.ltv);
    groups.push({title:({hdb:'HDB',ec:'EC',condo:'Condo'}[state.settings.property])+' Property Assessment Summary',rows:[{label:'Property price at '+(r.option.ltv*100).toFixed(0)+'% LTV',amount:money(budget.price,2),bold:true},{label:'Downpayment before purchase costs',amount:money(budget.equity,2)},{label:'Minimum cash downpayment',amount:money(budget.minCash,2)},{label:'Property type',amount:state.settings.property.toUpperCase()},{label:'Selected loan / '+tenure(r.option.months),amount:money(r.loan),bold:true},{label:'Effective MAS Assessment rate',amount:r.stress.toFixed(2)+'%'},...(r.actualEntered?[{label:'Quoted / illustrative rate',amount:M.n(state.settings.actualRate).toFixed(2)+'%'},{label:'Monthly instalment',amount:money(r.schedule.payment,2),bold:true},{label:'First-month principal',amount:money(r.schedule.rows[0]?.principal||0,2)},{label:'First-month interest',amount:money(r.schedule.rows[0]?.interest||0,2)},{label:'Monthly cash gap after estimated OA',amount:money(r.cashMonthly,2)}]:[])]});
    const inputs=[{label:'Assessment date',value:state.settings.asOf},{label:'Selected applicants',value:r.indices.map(i=>'Applicant '+(i+1)).join(', ')},{label:'Income-weighted age',value:r.age.toFixed(2)},{label:'Assumed maximum maturity age',value:state.settings.maxMaturity},{label:'Housing loan assumption',value:'First housing loan; no existing housing instalments'}];
    state.applicants.forEach((a,i)=>{const v=M.applicantValues(a,state.settings.asOf);for(const [label,value]of [['Name',a.name||'Not entered'],['DOB',DobInput.format(a.dob)||'Not entered'],['Age',v.age??'Not entered'],['Monthly income',money(M.n(a.income),2)],['Monthly income type',a.incomeType],['Other annual income',money(M.n(a.annual),2)],['Monthly CPF OA',money(v.cpf,2)],['Car loan',money(M.n(a.car),2)],['Credit-card monthly obligation',money(M.n(a.card),2)],['Other loan',money(M.n(a.other),2)]])inputs.push({label:'Applicant '+(i+1)+' / '+label,value:String(value)});});
    if(r.actualEntered)groups.push({title:'Annual amortisation summary',rows:Array.from({length:Math.ceil(r.schedule.rows.length/12)},(_,i)=>{const rows=r.schedule.rows.slice(i*12,i*12+12);return [{label:'Year '+(i+1)+' principal',amount:money(rows.reduce((n,row)=>n+row.principal,0),2)},{label:'Year '+(i+1)+' interest',amount:money(rows.reduce((n,row)=>n+row.interest,0),2)},{label:'Year '+(i+1)+' remaining balance',amount:money(rows.at(-1)?.balance||0,2)}];}).flat()});
    const name=state.name||window.EstatePlannerBridge?.getName()||'Affordability Assessment';return {name,scenario:'Affordability Assessment / '+state.settings.property.toUpperCase(),date:new Date().toLocaleString('en-SG',{timeZone:'Asia/Singapore'}),primaryLabel:'Maximum assessed loan / selected option',primary:money(r.option.maxLoan),groups,inputs,notes:state.notes,assumptions:['Bank-loan planning only. TDSR 55%; applicable MSR 30%. First housing loan assumed. Other annual income is always recognised at 70%; variable monthly income is also recognised at 70%. EC assumes MSR applies.','Joint age is weighted by gross assessable income. Standard LTV requires maturity by 65 and tenure up to 25 years for HDB / 30 years for private property. Longer loans use reduced LTV tiers.','Maximum bank-loan tenure: 30 years for HDB, 35 years for private property. The chosen maturity age is an editable bank-policy assumption, not a universal MAS cap.','2026 CPF private-sector employee tables and $8,000 monthly ordinary-wage ceiling used. OA excludes bonus CPF and remains subject to CPF usage limits.','Not an approval or HDB/EC eligibility assessment. Subject to lender verification, documentation, remaining lease, income and ownership rules.','Sources checked 28 Oct 2026: MAS macroprudential policies; MAS MSR and TDSR rules; CPF contribution and allocation rates 2026.']};
  }
  function exportAssessment(){
    const data=reportData();if(!data)return;
    const bytes=PropertyPdf.reportPdf(data),url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})),a=document.createElement('a');a.href=url;a.download=PropertyPdf.filename(data.name)+'.pdf';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  $('affForm').addEventListener('submit',e=>e.preventDefault());
  $('affForm').addEventListener('input',e=>{const index=+e.target.dataset.app,key=e.target.dataset.field;if(!key||!state.applicants[index])return;const a=state.applicants[index];a[key]=key==='dob'?DobInput.parse(e.target.value):e.target.type==='checkbox'?e.target.checked:e.target.value;if(key==='dob')a.ageAuto=true;if(key==='age')a.ageAuto=!M.has(a.age);if(key==='oa')a.oaAuto=!M.has(a.oa);if(key==='cpfProfile'){a.oaAuto=a.cpfProfile!=='manual';if(a.cpfProfile==='manual'){a.oa='';$('app-'+index+'-oa').value='';}}renderResults();persist();});
  $('affForm').addEventListener('change',e=>{if(e.target.tagName==='SELECT')e.target.dispatchEvent(new Event('input',{bubbles:true}));});
  $('affForm').addEventListener('click',e=>{if(e.target.dataset.resetAge!==undefined){const a=state.applicants[+e.target.dataset.resetAge];a.ageAuto=true;renderResults();persist();}if(e.target.dataset.resetOa!==undefined){const a=state.applicants[+e.target.dataset.resetOa];a.oaAuto=true;renderResults();persist();}if(e.target.dataset.remove!==undefined){state.applicants.splice(+e.target.dataset.remove,1);renderApplicants();renderResults();persist();}});
  $('addApplicant').addEventListener('click',()=>{if(state.applicants.length<2){state.applicants.push(M.applicant());state.settings.selection='pair';renderApplicants();renderResults();persist();}});
  $('affForm').addEventListener('focusout',e=>{if(e.target.inputMode==='decimal'&&e.target.dataset.field){const a=state.applicants[+e.target.dataset.app],key=e.target.dataset.field;if(key==='oa'&&a.oaAuto!==false)return;e.target.value=M.has(a[key])?number(a[key]):'';}});
  function chooseProperty(type,navigate=false){state.targets[state.settings.property].loan=state.settings.loan;state.settings.property=type;state.settings.term='standard';state.settings.loan=state.targets[type].loan||'';$('affProperty').value=type;importPlannerDetails();$('affLoan').value=state.settings.loan;renderResults();persist();if(navigate){$('affDetail').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});$('affDetailTitle').focus({preventScroll:true});}}
  for(const [key,id]of Object.entries(settingIds))$(id).addEventListener($(id).tagName==='SELECT'?'change':'input',()=>{if(key==='property'){chooseProperty($(id).value);return;}state.settings[key]=$(id).value;if(key==='loan')state.targets[state.settings.property].loan=state.settings.loan;renderResults();persist();});
  for(const id of ['affSelection'])$(id).addEventListener('click',e=>{const button=e.target.closest('[data-select-applicants]');if(!button||button.disabled)return;state.settings.selection=button.dataset.selectApplicants;state.settings.loan='';for(const t of Object.values(state.targets))t.loan='';renderResults();persist();});
  $('affComparison').addEventListener('click',e=>{const button=e.target.closest('[data-assess-property]');if(button)chooseProperty(button.dataset.assessProperty,true);});
  $('affComparison').addEventListener('keydown',e=>{if(e.target.tagName==='TR'&&['Enter',' '].includes(e.key)){e.preventDefault();chooseProperty(e.target.dataset.assessProperty,true);}});
  $('affStandardYears').addEventListener('focusout',()=>{if(!M.has(state.settings.standardYears))$('affStandardYears').value=lastResult.option.months?number(lastResult.option.months/12):'';});
  $('affDate').addEventListener('change',()=>{if(M.dateParts($('affDate').value)){state.settings.asOf=$('affDate').value;state.settings.asOfAuto=false;renderResults();persist();}});
  $('affToday').addEventListener('click',()=>{state.settings.asOf=M.today();state.settings.asOfAuto=true;$('affDate').value=state.settings.asOf;renderResults();persist();});
  $('affName').addEventListener('input',()=>{const old=state.name;state.name=$('affName').value;window.EstatePlannerBridge?.shareName(state.name,old);persist();});$('affNotes').addEventListener('input',()=>{state.notes=$('affNotes').value;persist();});
  $('amortisation').addEventListener('toggle',()=>{if($('amortisation').open)renderAmortisation();});
  $('applyAffLoan').addEventListener('click',()=>{const r=lastResult;if(r.within)window.EstatePlannerBridge?.applyLoan(state.settings.property==='hdb'?'hdb':'condo',M.propertyBudget(r.loan,r.option.ltv).price,M.propertyBudget(r.loan,r.option.ltv).price,r.loan);});
  $('saveAffDevice').addEventListener('click',()=>{
    persist();const name=state.name||window.EstatePlannerBridge?.getName()||'Assessment',now=new Date();
    const bytes=JSON.stringify({type:'estate-basics-affordability',version:1,savedAt:now.toISOString(),assessment:M.cleanState(state)},null,2);
    const url=URL.createObjectURL(new Blob([bytes],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=PropertyPdf.filename(name,now).replace('Property Planner - ','Affordability Assessment - ')+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    $('affSaveStatus').textContent='Assessment saved on this device and downloaded as a restore file.';
  });
  $('restoreAffDevice').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2000000)throw Error();const data=JSON.parse(await file.text());if(data.type!=='estate-basics-affordability'||data.version!==1||!Array.isArray(data.assessment?.applicants)||!data.assessment.applicants.length)throw Error();window.EstateAffordability.setState(data.assessment);$('affSaveStatus').textContent='Assessment restored and saved on this device.';}catch{$('affSaveStatus').textContent='Unable to restore. Choose a valid saved assessment JSON file.';}e.target.value='';});
  $('exportAffPdf').addEventListener('click',exportAssessment);
  for(const tab of tabs){$(tab+'Tab').addEventListener('click',()=>showTab(tab));$(tab+'Tab').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const index=tabs.indexOf(tab),next=e.key==='Home'?tabs[0]:e.key==='End'?tabs.at(-1):tabs[(index+(e.key==='ArrowLeft'?-1:1)+tabs.length)%tabs.length];showTab(next);$(next+'Tab').focus();}});}
  document.addEventListener('estate:show-tab',e=>showTab(e.detail));
  window.EstateAffordability={shareName(name,previous){if(!state.name||state.name===previous){state.name=String(name).slice(0,80);$('affName').value=state.name;persist();}},getReportData:reportData,getReportName:()=>state.name,getState:()=>M.cleanState(state),setState(raw){state=M.simplifyState(raw);state.settings.term='standard';state.settings.maxMaturity='65';renderApplicants();syncSettings();renderResults();persist();}};
  setInterval(()=>{if(state.settings.asOfAuto!==false&&state.settings.asOf!==M.today()){state.settings.asOf=M.today();$('affDate').value=state.settings.asOf;renderResults();persist();}},60000);
  renderApplicants();syncSettings();renderResults();
})();
