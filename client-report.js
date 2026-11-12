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
    years:'', rateOne:'', rateTwo:'', notes:''
  };
  const amounts = ['price','valuation','loan','oa','cash','grant','legal','misc','agent'];
  function clean(raw = {}){
    const state = {...defaults};
    state.type = raw.type === 'hdb' ? 'hdb' : 'condo';
    if (['Bank loan','HDB loan','No loan'].includes(raw.financing)) state.financing = raw.financing;
    if (state.type !== 'hdb' && state.financing === 'HDB loan') state.financing = 'Bank loan';
    for (const [key, limit] of [['client',65],['address',85],['notes',150]]) {
      state[key] = String(raw[key] ?? '').replace(/\s+/g,' ').slice(0,limit);
    }
    for (const key of [...amounts,'absd','years','rateOne','rateTwo']) {
      const rawValue = String(raw[key] ?? '').trim();
      const value = Number(rawValue);
      const limit = key === 'absd' ? 100 : key === 'years' ? 35 : amounts.includes(key) ? 1e10 : 25;
      if (rawValue && Number.isFinite(value) && value >= 0 && value <= limit) state[key] = rawValue;
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
    const priceLoan = buy.price*.75;
    const valuationLoan = buy.valuation*.75;
    const loanDifference = priceLoan-valuationLoan;
    const downpayment = buy.price*.20;
    // Allocate eligible funds to the 20% line first, within the valuation-based limit.
    const eligibleDownpayment = buy.basis*.20;
    const grantForDownpayment = Math.min(buy.grantUsed,eligibleDownpayment);
    const cpfForDownpayment = Math.min(buy.cpfUsed,eligibleDownpayment-grantForDownpayment);
    const cashForDownpayment = downpayment-cpfForDownpayment-grantForDownpayment;
    const downpaymentSplit = money(cashForDownpayment)+' cash + '+money(cpfForDownpayment)+' CPF'
      +(grantForDownpayment>0?' + '+money(grantForDownpayment)+' grant':'');
    const months = Math.round(Number(d.years)*12);
    const rates = [d.rateOne,d.rateTwo];
    const row = (label,value,bold=false,alert=false) => ({label,value:money(value),bold,alert});
    const title = d.financing;
    const date = new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Singapore',day:'2-digit',month:'short',year:'numeric'}).format(now);
    const valid = buy.price > 0 && (!buy.loanUsed || (months >= 1 && rates.some(rate => rate !== '')));
    return {
      valid, client:d.client.trim(), address:d.address.trim(), title, date, notes:d.notes.trim(),
      property:d.type === 'hdb' ? 'HDB resale purchase' : 'Private residential purchase',
      highlights:[
        ['Loan used', money(buy.loanUsed)],
        ['Cash available', d.cash === '' ? 'Not entered' : money(Number(d.cash))],
        ['CPF OA available', d.oa === '' ? 'Not entered' : money(Number(d.oa))]
      ],
      purchase:[
        row('PROPERTY PRICE',buy.price,true),
        row(d.valuation === '' ? 'Valuation assumed equal to purchase price' : 'Indicative valuation',buy.valuation,false,buy.cov>0),
        ...(hasLoan ? [
          row('75% loan on purchase price',priceLoan),
          row('75% loan on valuation',valuationLoan),
          row('Loan difference (price less valuation)',loanDifference,true,loanDifference>0)
        ] : []),
        ...(bankLoan ? [
          {label:'20% cash / CPF',value:downpaymentSplit,bold:true},
          row('5% CASH',buy.price*.05,true)
        ] : []),
        ...(hasLoan && buy.maxLoan>buy.loanUsed ? [row('Additional loan shortfall',buy.maxLoan-buy.loanUsed)] : []),
        row('Price to fund after loan',buy.price-buy.loanUsed,true),
        ...(buy.cov > 0 ? [row('Cash over valuation (included above)',buy.cov,false,true)] : []),
        {label:'Stamp duty (BSD + ABSD)',value:money(buy.bsd)+' + '+money(buy.absd)+' = '+money(buy.stampDutyTotal),bold:true},
        row('Legal fees',Number(d.legal)),
        row('Miscellaneous fees',Number(d.misc)),
        row('Agent service fee',buy.fee),
        ...(buy.grantUsed > 0 ? [row('CPF housing grants applied',buy.grantUsed)] : [])
      ],
      downpaymentNote: bankLoan
        ? 'The 20% and 5% lines use the purchase price. Cash over valuation is included in the funding total.'
        : '',
      tenure: !buy.loanUsed ? 'No mortgage payment' : months > 0
        ? 'Tenure: '+Math.floor(months/12)+' years'+(months%12?' '+months%12+' months':'')
        : 'Tenure: not entered',
      mortgage: buy.loanUsed ? rates.map((rate,i) => [
        'Option '+(i+1)+(rate===''?'':' · '+percent.format(Number(rate))+'% p.a.'),
        rate!=='' && months>0 ? money(loans.amortize(buy.loanUsed,Number(rate),months).payment) : 'Not entered'
      ]) : [],
      cashCheck:d.cash === '' || !buy.price ? '' : Number(d.cash)<buy.cashNeeded
        ? 'Cash shortfall: '+money(buy.cashNeeded-Number(d.cash))
        : 'Cash left after purchase: '+money(Number(d.cash)-buy.cashNeeded),
      totals:[
        ['TOTAL CASH / CPF',money(buy.cashNeeded)+' / '+money(buy.cpfUsed)]
      ],
      status: !buy.price ? 'Enter a purchase price to prepare the report.'
        : !valid ? 'Enter the loan tenure and at least one interest rate to download.'
        : d.loan!=='' && Number(d.loan)>buy.loanUsed && d.financing!=='No loan'
          ? 'The report uses '+money(buy.loanUsed)+', capped by the lower of price and valuation.'
          : 'Review these figures before sharing the PDF.'
    };
  }

  if (node) { module.exports = {clean,build}; return; }
  const $ = id => document.getElementById(id);
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const key = 'estate-basics-client-report-v1';
  let state = {...defaults};
  try { state = clean(JSON.parse(localStorage.getItem(key) || '{}')); } catch {}
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
    ${numeric('absd','ABSD rate (%)',100)}${amountField('legal','Legal fees')}
    ${amountField('misc','Miscellaneous fees')}${amountField('agent','Agent service fee (including any GST)')}
    ${numeric('years','Loan tenure (years)',35)}${numeric('rateOne','Interest rate 1 (%)',25)}
    ${numeric('rateTwo','Interest rate 2 (%)',25)}
    <label class="field client-note"><span class="field-label">Client note (optional)</span><input name="notes" maxlength="150"></label>
  </div>`;
  const field = name => form.elements.namedItem(name);
  function persist(){
    try { localStorage.setItem(key,JSON.stringify(clean(state))); } catch {}
  }
  function sync(){
    for (const [name,value] of Object.entries(state)) {
      const input = field(name);
      input.setCustomValidity('');
      input.value = amounts.includes(name) && value !== '' ? money(Number(value)) : value;
    }
  }
  const pairs = list => list.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('');
  function render(){
    const data = build(state);
    const invalidField = !form.checkValidity();
    const unsupportedText = [data.client,data.address,data.notes].some(value=>
      /[^\x20-\x7e–—‘’“”]/.test(value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'')));
    $('exportClientReport').disabled = !data.valid || invalidField || unsupportedText;
    $('clientReportStatus').textContent = invalidField ? 'Check the highlighted numeric fields.'
      : unsupportedText ? 'Use Latin-script text for the client name, address and note in the PDF.' : data.status;
    $('clientReportPreview').innerHTML = `<header><p>ESTATE BASICS / PRIVATE CLIENT REPORT</p><h3>${esc(data.title)}</h3><div>${esc(data.property)} · ${esc(data.date)}</div></header>
      ${data.client ? '<p class="client-prepared">Prepared for '+esc(data.client)+'</p>' : ''}
      ${data.address ? '<p class="client-prepared">'+esc(data.address)+'</p>' : ''}
      <dl class="client-highlights">${pairs(data.highlights)}</dl>
      <div class="client-preview-columns"><section><h4>Purchase &amp; funding</h4><dl class="client-purchase-rows">
        ${data.purchase.map(r=>`<div class="${r.bold?'client-emphasis':''} ${r.alert?'client-alert':''}"><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`).join('')}
      </dl></section><section><h4>Monthly mortgage</h4><p>${esc(data.tenure)}</p><dl class="client-mortgage">${pairs(data.mortgage)}</dl>
      ${data.cashCheck ? '<p>'+esc(data.cashCheck)+'</p>' : ''}</section></div>
      <dl class="client-highlights client-totals">${pairs(data.totals)}</dl>
      ${data.notes ? '<p class="client-prepared">'+esc(data.notes)+'</p>' : ''}
      ${data.downpaymentNote ? '<p class="client-preview-footer">'+esc(data.downpaymentNote)+'</p>' : ''}
      <p class="client-preview-footer">Planning estimate in SGD. Financing, CPF use and stamp duties are subject to confirmation. Rates are illustrative.</p>`;
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
      if (valid) state[input.name] = value === '' ? '' : String(Math.round(amount));
    } else {
      state[input.name] = input.value;
    }
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
      const value = state[input.name];
      input.value = value === '' ? '' : money(Number(value));
    }
  });
  form.addEventListener('submit',event=>event.preventDefault());
  $('importClientPurchase').addEventListener('click',()=>{
    const source = root.EstatePlannerBridge.getClientPurchase();
    if (!source) {
      $('clientImportStatus').textContent = 'Enter a purchase price in Property Planner first.';
      return;
    }
    const {buy,inputs,type,name} = source;
    state = clean({...state,type,client:state.client||name,financing:inputs.loanType,
      price:buy.price,valuation:inputs.buyValuation,loan:buy.loanUsed,oa:inputs.buyCpf,
      grant:type==='hdb'?inputs.buyGrant:'',absd:inputs.absdRate,legal:inputs.buyLegal,misc:inputs.buyMisc,
      agent:buy.fee,cash:state.cash||inputs.cashSavings});
    sync(); persist(); render();
    $('clientImportStatus').textContent = 'Purchase figures copied. Review cash available and CPF before sharing.';
  });
  $('importClientMortgage').addEventListener('click',()=>{
    const source = root.EstateAffordability.getClientMortgage();
    if (!source.months && source.rateOne==='' && source.rateTwo==='') {
      $('clientImportStatus').textContent = 'Enter a tenure or rates in Affordability Assessment first.';
      return;
    }
    state = clean({...state,years:source.months ? source.months/12 : state.years,
      rateOne:source.rateOne || state.rateOne,rateTwo:source.rateTwo || state.rateTwo});
    sync(); persist(); render();
    $('clientImportStatus').textContent = 'Available tenure and rates copied. Repayments use the loan shown in this report.';
  });
  $('exportClientReport').addEventListener('click',()=>{
    const now = new Date(), data = build(state,now);
    if (!data.valid) return;
    const url = URL.createObjectURL(new Blob([root.PropertyPdf.clientReport(data)],{type:'application/pdf'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = root.PropertyPdf.filename(data.client || data.property,now).replace('Property Planner - ','Client Report - ')+'.pdf';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
  });
  sync();
  render();
})(globalThis);
