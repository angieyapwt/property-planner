/* A purchase brief with a local draft, shared by the preview and PDF. */
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const property = node ? require('./model') : root.PropertyModel;
  const loans = node ? require('./affordability-model') : root.AffordabilityModel;
  const currency = new Intl.NumberFormat('en-SG', {style:'currency', currency:'SGD', maximumFractionDigits:0});
  const money = value => currency.format(value);
  const percent = new Intl.NumberFormat('en-SG', {maximumFractionDigits:4});
  const defaults = {
    client:'', address:'', type:'condo', financing:'Bank loan', price:'', valuation:'',
    loan:'', oa:'', cash:'', grant:'', absd:'0', legal:'', misc:'', agent:'',
    years:'', rateOne:'', rateTwo:'', notes:'', agentNote:'', splitCash:'', splitCpf:''
  };
  const amounts = ['price','valuation','loan','oa','cash','grant','legal','misc','agent','splitCash','splitCpf'];
  const rateLabels = ['Indicative Current Interest Rate','Stress Test Interest Rate'];
  function clean(raw = {}){
    const state = {...defaults};
    state.type = raw.type === 'hdb' ? 'hdb' : 'condo';
    if (['Bank loan','HDB loan','No loan'].includes(raw.financing)) state.financing = raw.financing;
    if (state.type !== 'hdb' && state.financing === 'HDB loan') state.financing = 'Bank loan';
    for (const [key, limit] of [['client',65],['address',85],['notes',150],['agentNote',120]]) {
      state[key] = String(raw[key] ?? '').replace(/\s+/g,' ').slice(0,limit);
    }
    for (const key of [...amounts,'absd','years','rateOne','rateTwo']) {
      const rawValue = String(raw[key] ?? '').trim();
      const value = Number(rawValue);
      const limit = key === 'absd' ? 100 : key === 'years' ? 35 : amounts.includes(key) ? 1e10 : 25;
      if (rawValue && Number.isFinite(value) && value >= (key==='valuation'?1:0) && value <= limit) state[key] = rawValue;
    }
    return state;
  }

  function build(raw, now = new Date()){
    const d = clean(raw);
    const plain = key => d[key] === '' ? '' : Number(d[key]).toFixed(4);
    const {buy} = property.calculate(d.type === 'hdb' ? 'buy-hdb' : 'buy-condo', {
      loanType:d.financing, buyPrice:plain('price'), buyValuation:plain('valuation'),
      buyLoan:plain('loan'), buyCpf:plain('oa'), buyGrant:plain('grant'),
      buyLegal:plain('legal'), buyMisc:plain('misc'), buyOverride:plain('agent'),
      buyCommissionOn:d.agent !== '', absdRate:plain('absd')
    });
    const bankLoan = d.financing === 'Bank loan';
    const hasLoan = d.financing !== 'No loan';
    const lowValuation = buy.valuation < buy.price;
    const priceLoan = buy.price*.75;
    const valuationLoan = buy.valuation*.75;
    const topUpOperator = Math.round(priceLoan)-Math.round(valuationLoan) === Math.round(buy.loanGap) ? ' = ' : ' ≈ ';
    const topUpCalculation = money(priceLoan)+' − '+money(valuationLoan)+topUpOperator+money(buy.loanGap);
    const share = bankLoan ? .20 : .25;
    const eligibleDownpayment = buy.basis*share;
    const grantForDownpayment = Math.min(buy.grantUsed,eligibleDownpayment);
    const defaultCpf = Math.min(buy.cpfUsed,eligibleDownpayment-grantForDownpayment);
    const splitTotal = Math.round(buy.price*share-grantForDownpayment);
    const splitEdited = hasLoan && (d.splitCash !== '' || d.splitCpf !== '');
    const splitCpf = d.splitCpf !== '' ? Number(d.splitCpf)
      : d.splitCash !== '' ? splitTotal-Number(d.splitCash) : Math.round(defaultCpf);
    const splitCash = d.splitCash === '' ? splitTotal-splitCpf : Number(d.splitCash);
    const splitError = hasLoan && splitEdited && (splitCash < 0 || splitCpf < 0 || splitCash+splitCpf !== splitTotal)
      ? 'Cash and CPF for this downpayment must add up to '+money(splitTotal)+'.'
      : hasLoan && splitEdited && splitCpf > Math.round(eligibleDownpayment-grantForDownpayment)
        ? 'CPF for this downpayment is limited to '+money(eligibleDownpayment-grantForDownpayment)+'.' : '';
    const downpaymentSplit = money(splitCash)+' Cash + '+money(splitCpf)+' CPF'
      +(grantForDownpayment>0?' + '+money(grantForDownpayment)+' grant':'');
    const cpfUsed = splitEdited && !splitError
      ? splitCpf+Math.min(buy.cpfUsed-defaultCpf,Math.max(Number(d.oa)-splitCpf,0))
      : buy.cpfUsed;
    // The purchase requirement already uses the valuation-capped loan.
    const cashNeeded = buy.requirement-buy.grantUsed-cpfUsed;
    const balance = (fund,available,used) => {
      if (available === '') return {label:fund+' available',value:'Not entered',tone:''};
      if (!buy.price) return {label:fund+' available',value:money(Number(available)),tone:''};
      const difference = Math.round(Number(available)-used);
      return {label:fund+(difference<0?' top-up needed':' remaining'),value:money(Math.abs(difference)),tone:difference<0?'shortfall':'remaining'};
    };
    const months = Math.round(Number(d.years)*12);
    const rates = [d.rateOne,d.rateTwo];
    const row = (label,value,bold=false,alert=false) => ({label,value:money(value),bold,alert});
    const title = d.financing;
    const date = new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Singapore',day:'2-digit',month:'short',year:'numeric'}).format(now);
    const valid = buy.price > 0 && !splitError && (!buy.loanUsed || (months >= 1 && rates.some(rate => rate !== '')));
    return {
      valid, split:{visible:hasLoan,label:bankLoan?'20% Cash / CPF':'25% Cash / CPF',cash:splitCash,cpf:splitCpf,error:splitError},
      client:d.client.trim(), address:d.address.trim(), title, date, notes:d.notes.trim(),
      property:d.type === 'hdb' ? 'HDB resale purchase' : 'Private residential purchase',
      highlights:[
        ['Loan used', money(buy.loanUsed)],
        ['Cash available', d.cash === '' ? 'Not entered' : money(Number(d.cash))],
        ['CPF OA available', d.oa === '' ? 'Not entered' : money(Number(d.oa))]
      ],
      purchase:[
        row('PROPERTY PRICE',buy.price,true),
        row(d.valuation === '' ? 'Valuation assumed equal to purchase price' : 'Indicative valuation',buy.valuation,false,lowValuation),
        ...(hasLoan ? [row('75% loan on purchase price',priceLoan)] : []),
        ...(hasLoan && lowValuation ? [
          row('75% loan on valuation',valuationLoan,false,true),
          {label:'Cash top-up from lower valuation',value:topUpCalculation,bold:true,alert:true}
        ] : []),
        ...(hasLoan ? [{label:bankLoan?'20% Cash / CPF':'25% Cash / CPF',value:downpaymentSplit,bold:true}] : []),
        ...(bankLoan ? [row('5% Cash',buy.price*.05,true)] : []),
        ...(hasLoan && buy.maxLoan>buy.loanUsed ? [row('Additional loan shortfall',buy.maxLoan-buy.loanUsed)] : []),
        ...(buy.cov > 0 ? [row('Cash over valuation',buy.cov,false,true)] : []),
        {label:'Stamp duty (BSD + ABSD)',value:money(buy.bsd)+' + '+money(buy.absd)+' = '+money(buy.stampDutyTotal),bold:true},
        row('Legal fees',Number(d.legal)),
        row('Miscellaneous fees',Number(d.misc)),
        row(d.agentNote?'Agent service fee *':'Agent service fee',buy.fee),
        ...(buy.grantUsed > 0 ? [row('CPF housing grants applied',buy.grantUsed)] : [])
      ],
      footnotes:[
        ...(d.agentNote ? ['* Agent service fee: '+d.agentNote.trim()] : []),
        ...(buy.loanUsed && rates.some(rate=>rate!=='') ? [
          "* Indicative rate only. The final interest rate is subject to "+(bankLoan?"the bank's":"HDB's")+" prevailing rates and approval at the point of loan application."
        ] : [])
      ],
      tenure: !buy.loanUsed ? 'No mortgage payment' : months > 0
        ? 'Tenure: '+Math.floor(months/12)+' years'+(months%12?' '+months%12+' months':'')
        : 'Tenure: not entered',
      mortgage: buy.loanUsed ? rates.map((rate,i) => [
        rateLabels[i]+(rate===''?'':' · '+percent.format(Number(rate))+'% p.a.'),
        rate!=='' && months>0 ? money(loans.amortize(buy.loanUsed,Number(rate),months).payment) : 'Not entered'
      ]) : [],
      totals:[
        {label:'Total Cash',value:money(cashNeeded),balance:balance('Cash',d.cash,cashNeeded)},
        {label:'Total CPF',value:money(cpfUsed),balance:balance('CPF',d.oa,cpfUsed)}
      ],
      status: !buy.price ? 'Enter a purchase price to prepare the report.'
        : splitError || (!valid ? 'Enter the loan tenure and at least one interest rate to download.'
        : d.loan!=='' && Number(d.loan)>buy.loanUsed && d.financing!=='No loan'
          ? 'The report uses '+money(buy.loanUsed)+', capped by the lower of price and valuation.'
          : 'Review these figures before sharing the PDF.')
    };
  }

  function calculatorFields(purchase, mortgage){
    const fields = {};
    if (purchase) {
      const {buy,inputs,type,name} = purchase;
      const optional = key => property.has(inputs[key]) ? property.n(inputs[key]) : '';
      Object.assign(fields,{
        type, client:name, financing:inputs.loanType, price:buy.price, valuation:optional('buyValuation'),
        loan:buy.loanUsed, oa:optional('buyCpf'), cash:optional('cashSavings'),
        grant:type==='hdb' ? optional('buyGrant') : '', absd:property.n(inputs.absdRate),
        legal:optional('buyLegal'), misc:optional('buyMisc'), agent:buy.fee
      });
    }
    if (mortgage) {
      const useCalculatorLoan = !purchase ||
        (mortgage.loanEntered && purchase.inputs.loanType === 'Bank loan' && purchase.inputs.buyLoanAuto !== false);
      if (useCalculatorLoan && mortgage.loan > 0 && mortgage.loan <= 1e10) fields.loan = mortgage.loan;
      if (mortgage.months > 0 && mortgage.months <= 420) fields.years = mortgage.months / 12;
      for (const key of ['rateOne','rateTwo']) {
        const rate = mortgage[key];
        if (rate !== '' && Number(rate) >= 0 && Number(rate) <= 25) fields[key] = rate;
      }
    }
    return fields;
  }

  if (node) { module.exports = {clean,build,calculatorFields}; return; }
  const $ = id => document.getElementById(id);
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const key = 'estate-basics-client-report-v1';
  let draft = {...defaults};
  const edited = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    draft = clean(saved.fields ?? saved);
    for (const name of saved.edited ?? []) if (Object.hasOwn(defaults,name)) edited.add(name);
  } catch {}
  let state = {...draft};
  const amountField = (field,label) => `<label class="field"><span class="field-label">${label}</span><input name="${field}" type="text" inputmode="numeric" autocomplete="off"></label>`;
  const numeric = (field,label,max) => `<label class="field"><span class="field-label">${label}</span><input name="${field}" type="number" min="${field==='valuation'?1:0}" max="${max}" step="any" inputmode="decimal"></label>`;
  const text = (field,label,max) => `<label class="field"><span class="field-label">${label}</span><input name="${field}" maxlength="${max}"></label>`;
  const form = $('clientReportForm');
  form.innerHTML = `<div class="form-grid">
    ${text('client','Client name (optional)',65)}${text('address','Property address (optional)',85)}
    <label class="field"><span class="field-label">Property type</span><select name="type"><option value="condo">Private residential</option><option value="hdb">HDB resale</option></select></label>
    <label class="field"><span class="field-label">Financing</span><select name="financing"><option>Bank loan</option><option>HDB loan</option><option>No loan</option></select></label>
    ${amountField('price','Purchase price')}${amountField('valuation','Indicative valuation (optional)')}
    ${amountField('loan','Approved loan amount (optional)')}${amountField('cash','Cash savings (optional)')}
    ${amountField('oa','CPF OA available')}${amountField('grant','HDB housing grant (if applicable)')}
    <fieldset id="clientDownpayment" class="client-downpayment client-note">
      <legend id="clientDownpaymentLabel"></legend>
      <div class="form-grid">${amountField('splitCash','Cash portion')}${amountField('splitCpf','CPF portion')}</div>
      <p class="small muted">Edit either amount. Clear an edited field to recalculate it.</p>
    </fieldset>
    ${numeric('absd','ABSD rate (%)',100)}${amountField('legal','Legal fees')}
    ${amountField('misc','Miscellaneous fees')}${amountField('agent','Agent service fee (including any GST)')}
    <label class="field client-note"><span class="field-label">Agent service fee footnote (optional)</span><input name="agentNote" maxlength="120"></label>
    ${numeric('years','Loan tenure (years)',35)}${numeric('rateOne',rateLabels[0]+' (%)',25)}
    ${numeric('rateTwo',rateLabels[1]+' (%)',25)}
    <label class="field client-note"><span class="field-label">Client note (optional)</span><input name="notes" maxlength="150"></label>
  </div>`;
  const field = name => form.elements.namedItem(name);
  function persist(){
    try { localStorage.setItem(key,JSON.stringify({fields:clean(draft),edited:[...edited]})); } catch {}
  }
  function sync(){
    for (const [name,value] of Object.entries(state)) {
      const input = field(name);
      input.setCustomValidity('');
      input.value = amounts.includes(name) && value !== '' ? money(Number(value)) : value;
    }
  }
  const pairs = list => list.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('');
  function syncSplit(split){
    $('clientDownpayment').hidden = !split.visible;
    $('clientDownpaymentLabel').textContent = split.label;
    for (const [name,portion] of [['splitCash',split.cash],['splitCpf',split.cpf]]) {
      const input = field(name);
      input.disabled = !split.visible;
      if (document.activeElement !== input && input.validity.valid) input.value = portion >= 0 ? money(portion) : '';
    }
  }
  function render(){
    const data = build(state);
    syncSplit(data.split);
    const invalidField = !form.checkValidity();
    const unsupportedText = [data.client,data.address,data.notes,...data.footnotes].some(value=>
      /[^\x20-\x7e–—‘’“”]/.test(value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'')));
    $('exportClientReport').disabled = !data.valid || invalidField || unsupportedText;
    $('saveClientReportDevice').disabled = invalidField;
    $('clientReportStatus').textContent = invalidField ? 'Check the highlighted numeric fields.'
      : unsupportedText ? 'Use Latin-script text for the client name, address and notes in the PDF.' : data.status;
    $('clientReportPreview').innerHTML = `<header><p>ESTATE BASICS / PRIVATE CLIENT REPORT</p><h3>${esc(data.title)}</h3><div>${esc(data.property)} · ${esc(data.date)}</div></header>
      ${data.client ? '<p class="client-prepared">Prepared for '+esc(data.client)+'</p>' : ''}
      ${data.address ? '<p class="client-prepared">'+esc(data.address)+'</p>' : ''}
      <dl class="client-highlights">${pairs(data.highlights)}</dl>
      <div class="client-preview-columns"><section><h4>Purchase &amp; funding</h4><dl class="client-purchase-rows">
        ${data.purchase.map(r=>`<div class="${r.bold?'client-emphasis':''} ${r.alert?'client-alert':''}"><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`).join('')}
      </dl></section><section><h4>Monthly mortgage</h4><p>${esc(data.tenure)}</p><dl class="client-mortgage">${pairs(data.mortgage)}</dl>
      </section></div>
      <dl class="client-highlights client-totals">${data.totals.map(({label,value,balance})=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd><dd class="client-balance ${balance.tone}">${esc(balance.label)} · ${esc(balance.value)}</dd></div>`).join('')}</dl>
      ${data.notes ? '<p class="client-prepared">'+esc(data.notes)+'</p>' : ''}
      ${data.footnotes.map(note=>'<p class="client-preview-footer">'+esc(note)+'</p>').join('')}`;
  }
  function update(event){
    const input = event.target;
    if (!Object.hasOwn(defaults,input.name)) return;
    if (amounts.includes(input.name)) {
      const value = input.value.replace(/[$,\s]/g,'');
      const minimum = input.name === 'valuation' ? 1 : 0;
      const amount = Number(value);
      const valid = value === '' || /^\d+(?:\.\d*)?$/.test(value) && amount >= minimum && amount <= 1e10;
      input.setCustomValidity(valid ? '' : 'Enter a valid dollar amount.');
      if (!valid) { render(); return; }
      state[input.name] = value === '' ? '' : String(Math.round(amount));
    } else {
      if (!input.validity.valid) { render(); return; }
      state[input.name] = input.value;
    }
    draft[input.name] = state[input.name];
    edited.add(input.name);
    if (state.type !== 'hdb' && state.financing === 'HDB loan') {
      state.financing = 'Bank loan';
      field('financing').value = 'Bank loan';
    }
    persist();
    render();
  }
  form.addEventListener('input',update);
  form.addEventListener('focusout',event=>{
    const input = event.target;
    if (amounts.includes(input.name) && input.validity.valid) {
      const split = input.name.startsWith('split') ? build(state).split : null;
      const value = split ? (input.name === 'splitCash' ? split.cash : split.cpf) : state[input.name];
      input.value = value === '' || Number(value)<0 ? '' : money(Number(value));
    }
  });
  form.addEventListener('submit',event=>event.preventDefault());
  function refreshFromCalculators(restore = false){
    const purchase = root.EstatePlannerBridge.getClientPurchase();
    const mortgage = root.EstateAffordability.getClientMortgage();
    const fields = calculatorFields(purchase,mortgage);
    if (!fields.client) delete fields.client;
    const available = Object.keys(fields);
    if (restore) {
      for (const name of [...available.filter(name=>name!=='client'),'splitCash','splitCpf']) {
        edited.delete(name);
        draft[name] = defaults[name];
      }
      persist();
    }
    state = clean({...draft,...Object.fromEntries(Object.entries(fields).filter(([name])=>!edited.has(name)))});
    $('refreshClientFigures').disabled = !available.length;
    $('clientImportStatus').textContent = restore ? 'Calculator figures restored.'
      : available.some(name=>edited.has(name)) ? 'Calculator figures refreshed. Your report edits were kept.'
      : available.length ? 'Available calculator figures filled in automatically.' : '';
    sync();
    render();
  }
  document.addEventListener('estate:tab-changed',event=>{
    if (event.detail === 'clientReport') refreshFromCalculators();
  });
  $('refreshClientFigures').addEventListener('click',()=>refreshFromCalculators(true));
  root.EstateClientReport = {
    startFresh(){
      draft = {...defaults};
      edited.clear();
      edited.add('client');
      persist();
      refreshFromCalculators();
      $('clientSaveStatus').textContent = '';
    }
  };
  function download(contents,type,extension,now){
    const data = clean(state);
    const url = URL.createObjectURL(new Blob([contents],{type}));
    const link = document.createElement('a');
    link.href = url;
    link.download = root.PropertyPdf.filename(data.client || 'Purchase',now).replace('Property Planner - ','Client Report - ')+extension;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  $('saveClientReportDevice').addEventListener('click',()=>{
    const now = new Date();
    persist();
    const saved = {type:'estate-basics-client-report',version:1,report:clean(state)};
    download(JSON.stringify(saved,null,2),'application/json','.json',now);
    $('clientSaveStatus').textContent = 'Client report downloaded as a restore file.';
  });
  $('chooseClientReportFile').addEventListener('click',()=>$('restoreClientReportDevice').click());
  $('restoreClientReportDevice').addEventListener('change',async event=>{
    const input = event.target;
    const file = input.files[0];
    if (!file) return;
    try {
      if (file.size > 2000000) throw Error();
      const saved = JSON.parse(await file.text());
      if (saved.type !== 'estate-basics-client-report' || saved.version !== 1 ||
        !saved.report || Array.isArray(saved.report) || typeof saved.report !== 'object') throw Error();
      draft = clean(saved.report);
      for (const name of Object.keys(defaults)) edited.add(name);
      persist();
      refreshFromCalculators();
      $('clientSaveStatus').textContent = 'Client report restored.';
    } catch {
      $('clientSaveStatus').textContent = 'Choose a saved Client Report JSON file.';
    }
    input.value = '';
  });
  $('exportClientReport').addEventListener('click',()=>{
    const now = new Date(), data = build(state,now);
    if ($('exportClientReport').disabled) return;
    download(root.PropertyPdf.clientReport(data),'application/pdf','.pdf',now);
  });
  sync();
  render();
})(globalThis);
