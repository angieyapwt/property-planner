/* Work backwards from a loan limit, eligible OA savings and cash. */
((root) => {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const property = isNode ? require('./model') : root.PropertyModel;
  const defaults = {
    propertyType: 'private', maxLoan: '', oaBalance: '', cashBalance: '',
    monthlyOa: '', monthlyCash: '', absdRate: '0', targetPrice: ''
  };
  const cents = amount => Math.round(amount * 100) / 100;
  const money = new Intl.NumberFormat('en-SG', {style:'currency', currency:'SGD', maximumFractionDigits:0});
  const format = amount => money.format(amount);
  const period = year => year === 0 ? 'Now' : 'Year ' + year;
  const propertyNames = {hdb:'HDB', ec:'Executive Condominium', private:'Private residential'};
  const amountKeys = Object.keys(defaults).filter(key => key !== 'propertyType');
  const parse = value => String(value ?? '').replace(/[$,\s]/g,'');
  const withinRange = (value,key) => value === '' || (/^\d+(?:\.\d+)?$/.test(value) &&
    Number(value) <= (key === 'absdRate' ? 100 : 1e9));

  function clean(raw = {}) {
    const state = {...defaults};
    if (['hdb', 'ec', 'private'].includes(raw.propertyType)) state.propertyType = raw.propertyType;
    for (const key of amountKeys) {
      const value = parse(raw[key]);
      if (value && withinRange(value,key)) state[key] = String(Math.round(Number(value)));
    }
    return state;
  }

  function purchaseCosts(price, state) {
    const downpayment = cents(price * .25);
    const loan = cents(Math.min(price * .75, Number(state.maxLoan)));
    const extraEquity = cents(Math.max(0, price - loan - downpayment));
    const bsd = price > 0 ? Math.max(1, property.stampDuty(price)) : 0;
    const absd = state.absdRate > 0 && price > 0
      ? Math.max(1, Math.floor(price * Number(state.absdRate) / 100 + 1e-8)) : 0;
    const agent = cents(property.commission(price, 1, true, undefined));
    const legal = price > 0 ? (state.propertyType === 'hdb' ? 2500 : 3000) : 0;
    const misc = price > 0 ? 1000 : 0;
    const outlay = cents(price - loan + bsd + absd + agent + legal + misc);
    const cashOnly = cents(price * .05 + agent + misc);
    return {price, loan, downpayment, extraEquity, bsd, absd, agent, legal, misc, outlay, cashOnly};
  }

  function cashRequired(costs, oa) {
    return cents(Math.max(costs.cashOnly, costs.outlay - oa));
  }

  function maxPrice(state, oa, cash) {
    // Cash required never falls as price rises. Search for the highest affordable whole dollar.
    let low = 0;
    let high = Math.floor(Number(state.maxLoan) + oa + cash);
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (cashRequired(purchaseCosts(mid, state), oa) <= cash) low = mid;
      else high = mid - 1;
    }
    return low;
  }

  function project(raw) {
    const state = clean(raw);
    const target = Number(state.targetPrice) > 0 ? purchaseCosts(Number(state.targetPrice), state) : null;
    const benchmark = purchaseCosts(Math.floor(Number(state.maxLoan) / .75), state);
    const monthlyOa = Number(state.monthlyOa);
    const rows = Array.from({length: 11}, (_, year) => {
      const oa = cents(Number(state.oaBalance) + monthlyOa * year * 12);
      const cash = cents(Number(state.cashBalance) + Number(state.monthlyCash) * year * 12);
      const price = maxPrice(state, oa, cash);
      const targetBalance = target ? cents(cash - cashRequired(target, oa)) : null;
      return {year, monthlyOa, oa, cash, price, targetBalance};
    });
    return {state, target, benchmark, rows};
  }

  function signedBalance(amount) {
    if (amount < 0) return {text:'-'+format(Math.ceil(-amount)), tone:'budget-gap'};
    if (amount > 0) return {text:'+'+format(Math.floor(amount)), tone:'budget-funded'};
    return {text:format(0), tone:'budget-funded'};
  }

  function reportData(raw, selectedYear) {
    const {state, target, benchmark, rows} = project(raw);
    const year = rows[selectedYear] || rows[0];
    const firstCovered = target && rows.find(row => row.targetBalance >= 0);
    const timing = !target ? 'Enter a target price to track the funding gap.'
      : firstCovered ? 'Target funded ' + (firstCovered.year === 0 ? 'now' : 'by Year ' + firstCovered.year) + '.'
      : 'Target still needs a top-up in Year 10.';
    const available = purchaseCosts(year.price, state);
    const scenarios = [benchmark, available, ...(target ? [target] : [])];
    const costLines = [
      ['Purchase price', 'price'], ['Loan used', 'loan'], ['Downpayment (25%)', 'downpayment'],
      ['Extra downpayment above 25%', 'extraEquity'], ['Buyer’s Stamp Duty (BSD)', 'bsd'],
      ['Additional Buyer’s Stamp Duty (ABSD)', 'absd'], ['Agent service fee (1% + 9% GST)', 'agent'],
      ['Legal fees', 'legal'], ['Miscellaneous fees', 'misc'], ['Total outlay (cash + CPF)', 'outlay'],
      ['Cash needed after CPF', costs => cashRequired(costs, year.oa)]
    ];
    return {
      state, year, target, timing, now:format(rows[0].price), benchmark:format(benchmark.price),
      propertyType:propertyNames[state.propertyType], targetToday:target ? signedBalance(rows[0].targetBalance) : null,
      yearLabel:period(year.year), 
      projectionHeaders:['When','Monthly CPF OA','Accumulated CPF OA','Cash savings','Max purchase price',...(target ? ['Target cash balance'] : [])],
      projectionRows:rows.map(row => ({
        label:period(row.year), values:[row.monthlyOa,row.oa,row.cash,row.price].map(format),
        balance:target ? signedBalance(row.targetBalance) : null, key:row.year === 0
      })),
      costHeaders:['Amount','Loan benchmark','Affordable · '+period(year.year),...(target ? ['At target price'] : [])],
      costRows:costLines.filter(([, key]) => key !== 'extraEquity' || scenarios.some(costs => costs.extraEquity > 0))
        .map(([label, key]) => ({label, key:key === 'outlay', values:scenarios.map(costs => format(typeof key === 'function' ? key(costs) : costs[key]))})),
      targetForYear: target ? signedBalance(year.targetBalance) : null,
      cash:format(year.cash), oa:format(year.oa), maxLoan:format(Number(state.maxLoan)),
      targetPrice:target ? format(target.price) : '',
      noPurchase:year.price === 0 ? 'No purchase fits the available cash and CPF OA for '+period(year.year).toLowerCase()+'. Check your balances and the minimum cash needed.' : ''
    };
  }

  if (isNode) {
    module.exports = {clean, purchaseCosts, cashRequired, project, reportData};
    return;
  }

  const $ = id => document.getElementById(id);
  const storageKey = 'estate-basics-purchase-budget-v1';
  const form = $('purchaseBudgetForm');
  let state = {...defaults};
  let linked = false;
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
    state = clean(stored.budget ?? stored);
    linked = stored.linked === true;
  } catch {}

  function sync() {
    for (const [key, value] of Object.entries(state)) {
      const input = form.elements.namedItem(key);
      input.setCustomValidity('');
      input.value = input.dataset.currency !== undefined && value !== '' ? format(Number(value)) : value;
    }
  }

  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify({budget:state, linked})); } catch {}
  }

  function showBalance(node, balance) {
    node.textContent = balance?.text ?? '—';
    node.classList.toggle('budget-gap', balance?.tone === 'budget-gap');
    node.classList.toggle('budget-funded', balance?.tone === 'budget-funded');
  }

  function render() {
    const data = reportData(state, Number($('purchaseBudgetYear').value));
    $('purchaseBudgetNow').textContent = data.now;
    $('purchaseBudgetBenchmark').textContent = data.benchmark;
    showBalance($('purchaseBudgetTarget'), data.targetToday);
    $('purchaseBudgetTiming').textContent = data.timing;
    $('purchaseBudgetTargetHeading').hidden = !data.target;
    $('purchaseBudgetProjection').innerHTML = data.projectionRows.map(row =>
      `<tr${row.key ? ' class="budget-key"' : ''}><th scope="row">${row.label}</th>` +
      row.values.map((value,index) => index === 3 ? `<td><strong>${value}</strong></td>` : `<td>${value}</td>`).join('') +
      (row.balance ? `<td class="${row.balance.tone}">${row.balance.text}</td>` : '') + '</tr>').join('');

    $('purchaseBudgetCostHead').innerHTML = data.costHeaders.map(label => `<th scope="col">${label}</th>`).join('');
    $('purchaseBudgetCosts').innerHTML = data.costRows.map(row =>
      `<tr${row.key ? ' class="budget-key"' : ''}><th scope="row">${row.label}</th>` +
      row.values.map(value => `<td>${value}</td>`).join('') + '</tr>').join('');
    $('purchaseBudgetCostNote').textContent = data.noPurchase;
  }

  function updateLinkedLoan() {
    const source = root.EstateAffordability.getPurchaseBudgetInputs(state.propertyType);
    state.maxLoan = source ? clean(source).maxLoan : '';
    $('purchaseBudgetStatus').textContent = source
      ? 'Max Loan linked to Affordability Assessment for ' + propertyNames[state.propertyType] + '.'
      : 'Complete the age and income details in Affordability Assessment to use a calculated Max Loan.';
  }

  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', event => {
    const input = event.target;
    const key = input.name;
    if (!Object.hasOwn(defaults,key)) return;
    if (key === 'propertyType') {
      state.propertyType = input.value;
      if (linked) {
        updateLinkedLoan();
        sync();
      }
    } else {
      const value = parse(input.value);
      const valid = withinRange(value,key);
      input.setCustomValidity(valid ? '' : 'Enter a valid non-negative amount.');
      if (!valid) {
        $('purchaseBudgetStatus').textContent = 'Check the highlighted field. Results reflect the last valid amounts.';
        return;
      }
      state = clean({...state, [key]:value});
      if (key === 'maxLoan') linked = false;
      if (form.checkValidity()) $('purchaseBudgetStatus').textContent = '';
    }
    persist();
    render();
  });
  form.addEventListener('focusout', event => {
    const input = event.target;
    if (!amountKeys.includes(input.name) || !input.validity.valid) return;
    const value = state[input.name];
    input.value = input.dataset.currency !== undefined && value !== '' ? format(Number(value)) : value;
  });

  function importAssessment(propertyType) {
    const source = root.EstateAffordability.getPurchaseBudgetInputs(propertyType);
    if (!source) {
      $('purchaseBudgetStatus').textContent = 'Enter age and income in Affordability Assessment first.';
      return;
    }
    state = clean({...state, ...source});
    linked = true;
    sync();
    persist();
    render();
    $('purchaseBudgetStatus').textContent = 'Max Loan and monthly CPF OA copied for ' + propertyNames[state.propertyType] + '.';
  }

  $('purchaseBudgetYear').addEventListener('change', render);
  $('purchaseBudgetImport').addEventListener('click', () => importAssessment(state.propertyType));
  document.addEventListener('estate:tab-changed', event => {
    if (event.detail !== 'purchaseBudget' || !linked) return;
    updateLinkedLoan();
    sync();
    persist();
    render();
  });
  $('openPurchaseBudget').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('estate:show-tab',{detail:'purchaseBudget'}));
    importAssessment();
    $('purchaseBudgetTab').focus();
  });

  function download(bytes, type, filename) {
    const url = URL.createObjectURL(new Blob([bytes], {type}));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  $('purchaseBudgetPdf').addEventListener('click', () => {
    if (!form.reportValidity()) return;
    const data = reportData(state, Number($('purchaseBudgetYear').value));
    const filename = root.PropertyPdf.filename('Purchase Budget').replace('Property Planner - ','Estate Basics - ');
    download(root.PropertyPdf.purchaseBudget(data), 'application/pdf', filename+'.pdf');
  });
  $('purchaseBudgetSave').addEventListener('click', () => {
    if (!form.reportValidity()) return;
    const bytes = JSON.stringify({type:'estate-basics-purchase-budget', version:1, budget:state}, null, 2);
    download(bytes, 'application/json', 'Estate Basics - Purchase Budget.json');
    $('purchaseBudgetStatus').textContent = 'Purchase budget downloaded as a restore file.';
  });
  $('purchaseBudgetRestore').addEventListener('click', () => $('purchaseBudgetFile').click());
  $('purchaseBudgetFile').addEventListener('change', async event => {
    const input = event.target;
    const file = input.files[0];
    if (!file) return;
    try {
      if (file.size > 2000000) throw Error();
      const saved = JSON.parse(await file.text());
      if (saved.type !== 'estate-basics-purchase-budget' || saved.version !== 1 ||
          !saved.budget || typeof saved.budget !== 'object' || Array.isArray(saved.budget)) throw Error();
      state = clean(saved.budget);
      linked = false;
      sync();
      persist();
      render();
      $('purchaseBudgetStatus').textContent = 'Purchase budget restored.';
    } catch {
      $('purchaseBudgetStatus').textContent = 'Choose a saved Purchase Budget JSON file.';
    }
    input.value = '';
  });

  for (let year = 0; year <= 10; year++) {
    $('purchaseBudgetYear').add(new Option(period(year), year));
  }
  sync();
  render();
})(globalThis);
