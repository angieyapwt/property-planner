/* Browser-local workspace; no analytics, forms, or external data requests. */
(() => {
  'use strict';
  const {scenarios,calculate,n,has,commission}=PropertyModel;
  const $=id=>document.getElementById(id);
  const money=v=>new Intl.NumberFormat('en-SG',{style:'currency',currency:'SGD',maximumFractionDigits:0}).format(Object.is(v,-0)?0:v);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const STORAGE='angie-property-studio-v1';
  const numericKeys=['salePrice','saleLoan','saleCpf','saleHip','saleLevy','saleSsd','salePenalty','saleLegal','saleMisc','saleRate','saleOverride','buyPrice','buyValuation','buyLoan','buyPaydown','buyCpf','buyGrant','buyLegal','buyMisc','buyRate','buyOverride','absdRate','cashSavings'];
  const boolKeys=['saleCommissionOn','buyCommissionOn','saleCommissionGst','buyCommissionGst','buyLoanAuto'];
  const knownKeys=[...numericKeys,...boolKeys,'loanType'];
  let cases=[],drafts={},current,savingAvailable=true,deleteId=null,toastTimer;
  const sharedSession={buy:{},sell:{},cash:{}};
  const defaultInputs=scenario=>{const c=scenarios[scenario];return {saleLegal:c.sell==='condo'?3000:2500,saleMisc:1000,saleRate:2,saleCommissionOn:true,saleCommissionGst:true,buyLegal:c.buy==='condo'?3000:2500,buyMisc:1000,buyRate:1,buyCommissionOn:true,buyCommissionGst:true,buyLoanAuto:true,loanType:c.buy==='hdb'?'HDB loan':'Bank loan',absdRate:0};};
  const blank=scenario=>({scenario,name:'',notes:'',inputs:defaultInputs(scenario)});
  function cleanRecord(r){
    if(!r||typeof r!=='object'||!Object.hasOwn(scenarios,r.scenario))throw Error('Unknown scenario');
    const inputs=defaultInputs(r.scenario);
    if(r.inputs && r.inputs.buyLoanAuto===undefined && has(r.inputs.buyLoan))inputs.buyLoanAuto=n(r.inputs.buyLoan)>=n(r.inputs.buyPrice)*.75;
    for(const k of knownKeys){const v=r.inputs?.[k];if(v===undefined)continue;if(boolKeys.includes(k))inputs[k]=v!==false;else if(k==='loanType')inputs[k]=['HDB loan','Bank loan','No loan'].includes(v)?v:inputs[k];else inputs[k]=has(v)?String(Math.min(n(v),1e12)):'';}
    return {scenario:r.scenario,name:String(r.name??'').slice(0,80),notes:String(r.notes??'').slice(0,4000),inputs,...(r.affordability?{affordability:AffordabilityModel.cleanState(r.affordability)}:{})};
  }
  function loadStorage(){try{const raw=localStorage.getItem(STORAGE);if(!raw)return;const data=JSON.parse(raw);if(data.version!==1)return;cases=(Array.isArray(data.cases)?data.cases:[]).slice(0,500).map(r=>({...cleanRecord(r),id:String(r.id||crypto.randomUUID()),savedAt:isNaN(Date.parse(r.savedAt))?new Date().toISOString():r.savedAt}));if(data.drafts&&typeof data.drafts==='object'){for(const k of Object.keys(scenarios)){if(data.drafts[k])drafts[k]=cleanRecord(data.drafts[k]);}}if(data.current)current=cleanRecord(data.current);}catch{savingAvailable=false;}}
  function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4300);}
  function persist(){drafts[current.scenario]=structuredClone(current);try{localStorage.setItem(STORAGE,JSON.stringify({version:1,cases,drafts,current}));savingAvailable=true;$('draftStatus').textContent='Draft saved on this device.';return true;}catch{savingAvailable=false;$('draftStatus').textContent='Browser storage unavailable. Download a backup to keep your figures.';return false;}}
  function calculatedCommission(side){return commission(n(current.inputs[side==='buy'?'buyPrice':'salePrice']),current.inputs[side+'Rate'],current.inputs[side+'CommissionOn'],null,current.inputs[side+'CommissionGst']!==false);}
  function moneyField(key,label,hint='',placeholder='0'){const raw=current.inputs[key];const value=key.endsWith('Override')&&!has(raw)?calculatedCommission(key.startsWith('sale')?'sale':'buy'):raw;return `<label class="field"><span class="field-label">${label}</span><div class="money-wrap"><span aria-hidden="true">$</span><input data-key="${key}" id="${key}" type="text" inputmode="decimal" maxlength="18" placeholder="${placeholder}" value="${has(value)?esc(n(value).toLocaleString('en-SG',{maximumFractionDigits:2})):''}" aria-label="${esc(label)}"></div>${hint?`<span class="hint">${hint}</span>`:''}</label>`;}
  function selectField(key,label,options,hint=''){return `<label class="field"><span class="field-label">${label}</span><select data-key="${key}" id="${key}">${options.map(([value,text])=>`<option value="${esc(value)}" ${String(current.inputs[key])===String(value)?'selected':''}>${text}</option>`).join('')}</select>${hint?`<span class="hint">${hint}</span>`:''}</label>`;}
  function commissionFields(side){
    const enabled=current.inputs[side+'CommissionOn']!==false, gst=current.inputs[side+'CommissionGst']!==false;
    return `<div class="commission-block"><div class="commission-options">
      <label class="checkline"><input type="checkbox" data-key="${side}CommissionGstChoice" ${enabled&&gst?'checked':''}> Include agent commission + GST (cash only)</label>
      <label class="checkline"><input type="checkbox" data-key="${side}CommissionPlainChoice" ${enabled&&!gst?'checked':''}> Include agent commission (without GST; cash only)</label>
      </div><div class="form-grid commission-grid ${enabled?'':'disabled'}"><label class="field"><span class="field-label">Commission rate (%)</span><input type="number" min="0" step="0.1" data-key="${side}Rate" value="${esc(current.inputs[side+'Rate'])}" ${enabled?'':'disabled'}><span class="hint">${gst?'9% GST is added to the commission.':'Uses the commission rate only. No GST is added.'}</span></label>${moneyField(side+'Override',gst?'Commission amount + GST, if edited':'Commission amount, if edited','Calculated automatically. Edit to override; clear to return to the rate.','Auto')}</div><button type="button" class="commission-reset text-button" data-reset-commission="${side}">Use commission rate</button></div>`;
  }
  function syncCommissionFields(){
    for(const side of ['buy','sale']){
      const input=$(side+'Override');if(!input)continue;
      const manual=has(current.inputs[side+'Override']);
      if(!manual)input.value=calculatedCommission(side).toLocaleString('en-SG',{maximumFractionDigits:2});
      input.dataset.mode=manual?'manual':'automatic';
      const reset=$('calculator').querySelector('[data-reset-commission="'+side+'"]');
      if(reset){reset.textContent=manual?'Use commission rate':'Calculated from commission rate';reset.disabled=!manual;}
    }
  }
  function syncAutoLoan(){
    const input=$('buyLoan');
    if(!input)return;
    const auto=current.inputs.buyLoanAuto!==false;
    const value=auto?n(current.inputs.buyPrice)*.75:current.inputs.buyLoan;
    if(auto)current.inputs.buyLoan=has(current.inputs.buyPrice)?String(value):'';
    input.value=has(value)?n(value).toLocaleString('en-SG',{maximumFractionDigits:2}):'';
    input.disabled=current.inputs.loanType==='No loan';
    const button=$('autoLoan');if(button){button.textContent=auto?'Automatic · 75% of purchase price':'Use automatic 75%';button.classList.toggle('is-auto',auto);}
  }
  function rememberShared(record){
    const c=scenarios[record.scenario];
    for(const side of ['buy','sell']){
      if(!c[side])continue;
      const prefix=side==='sell'?'sale':'buy',values={};
      for(const key of knownKeys)if(key.startsWith(prefix)||(side==='buy'&&['loanType','absdRate'].includes(key)))if(record.inputs[key]!==undefined)values[key]=record.inputs[key];
      sharedSession[side][c[side]]=values;
    }
    if(record.inputs.cashSavings!==undefined)sharedSession.cash.cashSavings=record.inputs.cashSavings;
  }
  function hydrateShared(record){
    const c=scenarios[record.scenario];
    if(c.buy)Object.assign(record.inputs,sharedSession.buy[c.buy]||{},sharedSession.cash);
    if(c.sell)Object.assign(record.inputs,sharedSession.sell[c.sell]||{});
    return record;
  }
  function panel(number,title,description,fields,commission=''){return `<section class="form-section"><div class="panel-heading"><span class="panel-number">${number}</span><div><h2>${title}</h2><p>${description}</p></div></div><div class="form-grid">${fields}</div>${commission}</section>`;}
  function renderFields(){const c=scenarios[current.scenario];let html='';
    if(c.sell){const hdb=c.sell==='hdb';html+=panel('A',hdb?'Your HDB sale':'Your condo sale','Start with your sale price and the amounts to be returned.',[
      moneyField('salePrice','Selling price'),moneyField('saleLoan','Outstanding loan'),moneyField('saleCpf','CPF refund with accrued interest'),
      ...(hdb?[moneyField('saleHip','Outstanding HIP, if any'),moneyField('saleLevy','Resale levy, if applicable')]:[moneyField('saleSsd','Seller stamp duty, if any')]),
      moneyField('salePenalty','Bank penalty, if any'),moneyField('saleLegal','Seller legal fee'),moneyField('saleMisc','Seller miscellaneous fee','Cash only.')
    ].join(''),commissionFields('sale'));}
    if(c.buy){const hdb=c.buy==='hdb';const loanOptions=hdb?[['HDB loan','HDB loan'],['Bank loan','Bank loan'],['No loan','No loan']]:[['Bank loan','Bank loan'],['No loan','No loan']];
      html+=panel(c.sell?'B':'A',hdb?'Your HDB purchase':'Your condo purchase','Build a complete picture of your purchase and financing.',[
        moneyField('buyPrice','Purchase price'),moneyField('buyValuation',hdb?'HDB valuation':'Bank valuation / market value','Leave blank to use the purchase price. Any price above valuation is cash only.','Same as price'),
        selectField('loanType','Loan type',loanOptions),('<div class="loan-field">'+moneyField('buyLoan','Approved loan amount','Starts at 75% of purchase price. You may enter a lower approved amount. The loan used is capped by valuation.')+'<button type="button" id="autoLoan" class="auto-loan">Use automatic 75%</button></div>'),
        ...(hdb&&c.sell&&current.inputs.loanType==='HDB loan'?[moneyField('buyPaydown','Second HDB loan proceeds paydown','Blank uses 50% of positive sale proceeds, capped at the approved loan. Enter 0 to override.','Auto')]:[]),
        moneyField('buyCpf','Total CPF OA available','Include any CPF refund you intend to use for this purchase.'),...(hdb?[moneyField('buyGrant','CPF housing grants, if any')]:[]),
        selectField('absdRate','ABSD profile',hdb?[[0,'Not applicable - 0%'],[5,'SPR first property, if applicable - 5%']]:[[0,'SC first residential property - 0%'],[20,'SC second residential property - 20%'],[5,'PR first residential property - 5%'],[30,'PR second residential property - 30%']], 'Select the profile that applies to the purchase.'),
        moneyField('buyLegal','Buyer legal fee'),moneyField('buyMisc','Buyer miscellaneous fee','Cash only.')
      ].join(''),commissionFields('buy'));
      html+=panel(c.sell?'C':'B','Your available cash','Allocate the cash you want to use for this move.',moneyField('cashSavings','Cash savings allocated','Additional to sale proceeds. CPF is accounted for separately.'));
    }
    $('fields').innerHTML=html;
    for(const side of ['sale','buy']){const input=$('fields').querySelector(`[data-key="${side}Override"]`);if(input)input.disabled=current.inputs[side+'CommissionOn']===false;}
    syncAutoLoan();
    $('scenario').value=current.scenario;$('scenarioDescription').textContent=c.description;$('estimateName').value=current.name;$('notes').value=current.notes;
  }
  function metric(label,value){return `<div class="metric"><span>${label}</span><strong>${money(value)}</strong></div>`;}
  function renderSummary(){syncCommissionFields();const v=calculate(current.scenario,current.inputs);$('primaryLabel').textContent=v.primaryLabel;$('primary').textContent=v.hasFigures?money(v.primary):'$—';$('saveEstimate').disabled=!v.hasFigures;$('exportPdf').disabled=!v.hasFigures;
    $('resultCaption').textContent=!v.hasFigures?'Enter your figures to start planning.':v.buy?(v.topUp>0?'After eligible CPF, grants, allocated savings'+(v.sale?' and sale proceeds.':'.'):'Your allocated funds cover this estimate. Review the breakdown below.'):(v.primary<0?'Your sale figures show a shortfall to be funded.':'After your loan, CPF refund, fees and commission.');
    let metrics='';if(v.buy){metrics+=metric('Loan used',v.buy.loanUsed)+metric('CPF + grants used',v.buy.cpfUsed+v.buy.grantUsed);if(v.sale)metrics+=metric('Sale proceeds',v.sale.proceeds);metrics+=metric('Purchase cash needed',v.buy.cashNeeded)+metric('Cash remaining',v.buffer);}else if(v.sale){metrics=metric('Selling price',v.sale.price)+metric('Total deductions',v.sale.price-v.sale.proceeds);}
    $('metrics').innerHTML=metrics;
    let allocation='';if(v.buy&&v.hasFigures){const total=Math.max(v.buy.requirement+v.buy.loanUsed,1);const loan=Math.min(v.buy.loanUsed/total*100,100),cpf=Math.min((v.buy.cpfUsed+v.buy.grantUsed)/total*100,100),cash=Math.max(100-loan-cpf,0);allocation=`<div class="funding-bar" aria-hidden="true"><span class="loan" style="width:${loan}%"></span><span class="cpf" style="width:${cpf}%"></span><span class="cash" style="width:${cash}%"></span></div>Loan · CPF &amp; grants · Cash${v.buy.cov>0?`<br><strong>${money(v.buy.cov)} cash-over-valuation</strong> is included in your cash requirement.`:''}`;}
    $('allocation').innerHTML=allocation;
    $('breakdown').innerHTML=v.groups.map(g=>`<section class="breakdown-card"><h3>${g.title}</h3>${g.rows.map(r=>`<div class="breakdown-row ${r.kind} ${r.bold?'emphasis':''} ${r.red?'red':''}"><span>${esc(r.label)}</span><span class="row-amount">${money(r.value)}</span></div>`).join('')}</section>`).join('');
    $('savedCount').textContent=cases.length;return v;
  }
  function render(){renderFields();renderSummary();}
  function switchScenario(scenario){rememberShared(current);drafts[current.scenario]=structuredClone(current);current=hydrateShared(drafts[scenario]?cleanRecord(drafts[scenario]):blank(scenario));render();persist();}
  function saveEstimate(){if(!calculate(current.scenario,current.inputs).hasFigures){toast('Enter a purchase or selling price before saving.');return;}if(cases.length>=500){toast('Your collection is full. Download a backup and remove older estimates.');return;}
    const record={...structuredClone(current),affordability:window.EstateAffordability?.getState(),id:crypto.randomUUID(),savedAt:new Date().toISOString()};if(!record.name)record.name=scenarios[current.scenario].label;cases.unshift(record);
    if(!persist()){cases.shift();toast('Unable to save in this browser. Use Download backup to keep your draft.');return;}renderSummary();toast('Estimate saved on this device.');}
  function renderSaved(){const list=$('savedList');list.replaceChildren();if(!cases.length){list.innerHTML='<div class="empty-state">Your next chapter starts here.<p class="small">Save an estimate to build your collection.</p></div>';return;}
    for(const r of cases){const v=calculate(r.scenario,r.inputs);const item=document.createElement('article');item.className='saved-item';const details=document.createElement('div');const title=document.createElement('h3');title.textContent=r.name;const subtitle=document.createElement('p');subtitle.textContent=scenarios[r.scenario].label+' · '+new Date(r.savedAt).toLocaleDateString('en-SG',{day:'numeric',month:'short',year:'numeric'});const amount=document.createElement('p');amount.textContent=v.primaryLabel+': '+money(v.primary);details.append(title,subtitle,amount);const actions=document.createElement('div');actions.className='saved-item-actions';const open=document.createElement('button');open.textContent='Open ↗';open.addEventListener('click',()=>{drafts[current.scenario]=structuredClone(current);current=cleanRecord(r);if(r.affordability)window.EstateAffordability?.setState(r.affordability);rememberShared(current);render();persist();$('savedDialog').close();toast('Saved estimate opened. Save again to keep a new copy.');});const del=document.createElement('button');del.textContent='Remove';del.setAttribute('aria-label','Remove '+r.name);del.addEventListener('click',()=>{deleteId=r.id;$('deleteDialog').showModal();});actions.append(open,del);item.append(details,actions);list.append(item);}
  }
  function download(bytes,type,name){const url=URL.createObjectURL(new Blob([bytes],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  function filename(name){return PropertyPdf.filename(name);}
  function inputDetails(){const labels={salePrice:'Selling price',saleLoan:'Outstanding sale loan',saleCpf:'CPF refund with accrued interest',saleHip:'Outstanding HIP',saleLevy:'Resale levy',saleSsd:'Seller stamp duty',salePenalty:'Bank penalty',saleLegal:'Seller legal fee',saleMisc:'Seller miscellaneous fee',saleRate:'Seller commission rate (%)',saleOverride:'Seller edited commission including GST',buyPrice:'Purchase price',buyValuation:'Valuation / market value',buyLoan:'Approved purchase loan',buyPaydown:'Second HDB loan proceeds paydown',buyCpf:'CPF OA available',buyGrant:'CPF housing grants',buyLegal:'Buyer legal fee',buyMisc:'Buyer miscellaneous fee',buyRate:'Buyer commission rate (%)',buyOverride:'Buyer edited commission including GST',absdRate:'ABSD rate (%)',cashSavings:'Cash savings allocated',loanType:'Loan type',saleCommissionOn:'Include seller commission',buyCommissionOn:'Include buyer commission',saleCommissionGstChoice:'Seller commission with GST',saleCommissionPlainChoice:'Seller commission without GST',buyCommissionGstChoice:'Buyer commission with GST',buyCommissionPlainChoice:'Buyer commission without GST'};
    labels.saleOverride=current.inputs.saleCommissionGst===false?'Seller edited commission (without GST)':'Seller edited commission including GST';
    labels.buyOverride=current.inputs.buyCommissionGst===false?'Buyer edited commission (without GST)':'Buyer edited commission including GST';
    const keys=[...$('fields').querySelectorAll('[data-key]')].map(el=>el.dataset.key);return keys.map(k=>({label:labels[k]||k,value:k.endsWith('Choice')?((k.endsWith('GstChoice')?current.inputs[k.startsWith('sale')?'saleCommissionGst':'buyCommissionGst']!==false:current.inputs[k.startsWith('sale')?'saleCommissionGst':'buyCommissionGst']===false)&&current.inputs[k.startsWith('sale')?'saleCommissionOn':'buyCommissionOn']!==false?'Yes':'No'):boolKeys.includes(k)?(current.inputs[k]===false?'No':'Yes'):k==='loanType'?current.inputs[k]:k.endsWith('Rate')?String(n(current.inputs[k]))+'%':has(current.inputs[k])?money(n(current.inputs[k])):k==='buyValuation'?'Same as purchase price':k.endsWith('Override')?money(calculatedCommission(k.startsWith('sale')?'sale':'buy'))+' (automatic)':k==='buyPaydown'?'Auto: 50% of positive sale proceeds, capped at loan':'Not entered'}));
  }
  function exportPdf(){try{const v=calculate(current.scenario,current.inputs);const name=current.name||scenarios[current.scenario].label;const bytes=PropertyPdf.reportPdf({name,scenario:scenarios[current.scenario].label,date:new Date().toLocaleString('en-SG'),inputs:inputDetails(),groups:v.groups.map(g=>({...g,rows:g.rows.map(r=>({...r,amount:money(r.value)}))})),notes:current.notes,primaryLabel:v.primaryLabel,primary:money(v.primary)});download(bytes,'application/pdf',filename(name)+'.pdf');toast('PDF report downloaded.');}catch{toast('PDF export failed. Your figures are still available. Try again.');}}
  loadStorage();current=current||blank('buy-hdb');rememberShared(current);
  $('scenario').innerHTML=Object.entries(scenarios).map(([id,c])=>`<option value="${id}">${c.label}</option>`).join('');
  $('scenario').addEventListener('change',e=>switchScenario(e.target.value));
  $('calculator').addEventListener('submit',e=>e.preventDefault());
  function handleField(event){
    const input=event.target,key=input.dataset.key;
    if(!key)return;
    if(key.endsWith('CommissionGstChoice')||key.endsWith('CommissionPlainChoice')){
      const side=key.startsWith('sale')?'sale':'buy';
      current.inputs[side+'CommissionOn']=input.checked;
      current.inputs[side+'CommissionGst']=key.endsWith('CommissionGstChoice');
      renderFields();
    }else{
      if(!knownKeys.includes(key))return;
      current.inputs[key]=input.type==='checkbox'?input.checked:input.value;
      if(key==='buyLoan')current.inputs.buyLoanAuto=!has(input.value);
      if(key==='loanType')renderFields();
      else if(key==='buyPrice'||key==='buyLoan')syncAutoLoan();
    }
    rememberShared(current);renderSummary();persist();
  }
  $('calculator').addEventListener('input',handleField);
  $('calculator').addEventListener('change',event=>{if(event.target.tagName==='SELECT')handleField(event);});
  $('calculator').addEventListener('click',event=>{if(event.target.dataset.resetCommission){current.inputs[event.target.dataset.resetCommission+'Override']='';syncCommissionFields();rememberShared(current);renderSummary();persist();}if(event.target.id==='autoLoan'){current.inputs.buyLoanAuto=true;syncAutoLoan();rememberShared(current);renderSummary();persist();}});
  $('calculator').addEventListener('focusout',e=>{const key=e.target.dataset.key;if(!numericKeys.includes(key)||e.target.type==='number')return;e.target.value=has(current.inputs[key])?n(current.inputs[key]).toLocaleString('en-SG',{maximumFractionDigits:2}):'';syncCommissionFields();});
  $('estimateName').addEventListener('input',e=>{current.name=e.target.value;persist();});$('notes').addEventListener('input',e=>{current.notes=e.target.value;persist();});
  $('saveEstimate').addEventListener('click',saveEstimate);$('exportPdf').addEventListener('click',exportPdf);
  $('openSaved').addEventListener('click',()=>{renderSaved();$('savedDialog').showModal();});$('closeSaved').addEventListener('click',()=>$('savedDialog').close());
  $('reset').addEventListener('click',()=>$('resetDialog').showModal());$('cancelReset').addEventListener('click',()=>$('resetDialog').close());$('confirmReset').addEventListener('click',()=>{current=blank(current.scenario);render();persist();$('resetDialog').close();toast('A fresh estimate is ready.');});
  $('cancelDelete').addEventListener('click',()=>$('deleteDialog').close());$('confirmDelete').addEventListener('click',()=>{const old=cases;cases=cases.filter(r=>r.id!==deleteId);if(!persist()){cases=old;toast('Unable to remove the estimate from browser storage.');}else toast('Saved estimate removed.');renderSaved();renderSummary();$('deleteDialog').close();});
  $('toggleDetails').addEventListener('click',()=>{const hide=!$('breakdown').hidden;$('breakdown').hidden=hide;$('toggleDetails').setAttribute('aria-expanded',String(!hide));$('toggleDetails').textContent=hide?'Show breakdown +':'Hide breakdown −';});
  $('backup').addEventListener('click',()=>{download(JSON.stringify({version:1,cases,drafts,current,affordability:window.EstateAffordability?.getState()},null,2),'application/json','estate-basics-backup-'+new Date().toISOString().slice(0,10)+'.json');toast('Backup downloaded.');});
  $('importBackup').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2000000)throw Error('File too large');const data=JSON.parse(await file.text());if(data.version!==1||!Array.isArray(data.cases))throw Error('Invalid backup');const incoming=data.cases.slice(0,500).map(r=>({...cleanRecord(r),id:String(r.id||crypto.randomUUID()),savedAt:isNaN(Date.parse(r.savedAt))?new Date().toISOString():r.savedAt}));const draft=data.current?cleanRecord(data.current):null;const previousCases=cases,previousCurrent=current;const ids=new Set(cases.map(r=>r.id));cases=[...incoming.filter(r=>!ids.has(r.id)),...cases].slice(0,500);if(draft){drafts[current.scenario]=structuredClone(current);current=draft;}if(!persist()){cases=previousCases;current=previousCurrent;throw Error('Storage unavailable');}if(data.affordability)window.EstateAffordability?.setState(data.affordability);render();renderSaved();toast('Backup restored. Existing saved estimates were kept.');}catch{toast('Could not restore this backup. Choose a Estate Basics JSON backup and check browser storage.');}e.target.value='';});
  window.EstatePlannerBridge={
    getInputs(type){const config=scenarios[current.scenario];if(config.buy===type)return {...current.inputs};const values=sharedSession.buy[type];if(values)return {...values};for(const record of Object.values(drafts))if(scenarios[record.scenario]?.buy===type)return {...record.inputs};return {};},
    applyLoan(type,price,valuation,loan){const scenario=type==='hdb'?'buy-hdb':'buy-condo';switchScenario(scenario);if(has(price))current.inputs.buyPrice=price;if(has(valuation))current.inputs.buyValuation=valuation;current.inputs.loanType='Bank loan';current.inputs.buyLoan=loan;current.inputs.buyLoanAuto=false;render();rememberShared(current);persist();document.dispatchEvent(new CustomEvent('estate:show-tab',{detail:'planner'}));toast('Assessed loan copied to the Property Planner.');},
    getName(){return current.name||scenarios[current.scenario].label;}
  };
  render();if(!savingAvailable)$('draftStatus').textContent='Browser storage unavailable. Download a backup to keep your figures.';
})();
