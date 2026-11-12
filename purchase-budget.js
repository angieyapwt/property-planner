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

  function clean(raw = {}) {
    const state = {...defaults};
    if (['hdb', 'ec', 'private'].includes(raw.propertyType)) state.propertyType = raw.propertyType;
    for (const key of ['maxLoan', 'oaBalance', 'cashBalance', 'monthlyOa', 'monthlyCash', 'absdRate', 'targetPrice']) {
      const value = String(raw[key] ?? '').trim();
      const amount = Number(value);
      if (value && Number.isFinite(amount) && amount >= 0 && amount <= (key === 'absdRate' ? 100 : 1e9)) {
        state[key] = String(cents(amount));
      }
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
      const targetTopUp = target ? cents(Math.max(0, cashRequired(target, oa) - cash)) : null;
      return {year, monthlyOa, oa, cash, price, targetTopUp};
    });
    return {state, target, benchmark, rows};
  }

  if (isNode) {
    module.exports = {clean, purchaseCosts, cashRequired, project};
    return;
  }

  const $ = id => document.getElementById(id);
  const storageKey = 'estate-basics-purchase-budget-v1';
  const money = new Intl.NumberFormat('en-SG', {style:'currency', currency:'SGD', maximumFractionDigits:0});
  const format = amount => money.format(amount);
  const period = year => year === 0 ? 'Now' : 'Year ' + year;
  const form = $('purchaseBudgetForm');
  let state = {...defaults};
  try { state = clean(JSON.parse(localStorage.getItem(storageKey) || '{}')); } catch {}

  function sync() {
    for (const [key, value] of Object.entries(state)) form.elements.namedItem(key).value = value;
  }

  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
  }

  function render() {
    const {target, benchmark, rows} = project(state);
    const current = rows[0];
    const year = rows[Number($('purchaseBudgetYear').value)];
    const firstCovered = target && rows.find(row => row.targetTopUp === 0);
    $('purchaseBudgetNow').textContent = format(current.price);
    $('purchaseBudgetBenchmark').textContent = format(benchmark.price);
    $('purchaseBudgetTarget').textContent = target ? format(Math.ceil(current.targetTopUp)) : '—';
    $('purchaseBudgetTiming').textContent = !target ? 'Enter a target purchase price to track the gap.'
      : firstCovered ? 'Target funded ' + (firstCovered.year === 0 ? 'now' : 'by Year ' + firstCovered.year) + '.'
      : 'Target still needs a top-up in Year 10.';
    $('purchaseBudgetTargetHeading').hidden = !target;
    $('purchaseBudgetProjection').innerHTML = rows.map(row => `
      <tr${row.year === 0 ? ' class="budget-key"' : ''}>
        <th scope="row">${period(row.year)}</th>
        <td>${format(row.monthlyOa)}</td><td>${format(row.oa)}</td><td>${format(row.cash)}</td>
        <td><strong>${format(row.price)}</strong></td>
        ${target ? `<td class="${row.targetTopUp > 0 ? 'budget-gap' : 'budget-funded'}">${row.targetTopUp > 0 ? format(Math.ceil(row.targetTopUp)) : 'Funded'}</td>` : ''}
      </tr>`).join('');

    const affordable = purchaseCosts(year.price, state);
    const scenarios = [benchmark, affordable, ...(target ? [target] : [])];
    $('purchaseBudgetCostHead').innerHTML = '<th scope="col">Amount</th><th scope="col">Loan benchmark</th>' +
      '<th scope="col">Affordable · ' + period(year.year) + '</th>' + (target ? '<th scope="col">At target price</th>' : '');
    const lines = [
      ['Purchase price', 'price'], ['Loan used', 'loan'], ['Downpayment (25%)', 'downpayment'],
      ['Extra downpayment above 25%', 'extraEquity'], ['Buyer’s Stamp Duty (BSD)', 'bsd'],
      ['Additional Buyer’s Stamp Duty (ABSD)', 'absd'], ['Agent service fee (1% + 9% GST)', 'agent'],
      ['Legal fees', 'legal'], ['Miscellaneous fees', 'misc'], ['Total outlay (cash + CPF)', 'outlay'],
      ['Cash needed after CPF', costs => cashRequired(costs, year.oa)]
    ];
    $('purchaseBudgetCosts').innerHTML = lines
      .filter(([, key]) => key !== 'extraEquity' || scenarios.some(costs => costs.extraEquity > 0))
      .map(([label, key]) => `<tr${key === 'outlay' ? ' class="budget-key"' : ''}><th scope="row">${label}</th>` +
        scenarios.map(costs => `<td>${costs.price > 0 ? format(typeof key === 'function' ? key(costs) : costs[key]) : '—'}</td>`).join('') +
        '</tr>').join('');
  }

  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', () => {
    if (!form.checkValidity()) return;
    state = clean(Object.fromEntries(new FormData(form)));
    persist();
    render();
  });
  $('purchaseBudgetYear').addEventListener('change', render);
  $('purchaseBudgetImport').addEventListener('click', () => {
    const source = root.EstateAffordability?.getPurchaseBudgetInputs();
    if (!source) {
      $('purchaseBudgetStatus').textContent = 'Enter age and income in Affordability Assessment first.';
      return;
    }
    state = clean({...state, ...source});
    sync();
    persist();
    render();
    $('purchaseBudgetStatus').textContent = 'Max Loan and monthly CPF OA copied from Affordability Assessment.';
  });
  $('purchaseBudgetSave').addEventListener('click', () => {
    if (!form.reportValidity()) return;
    const bytes = JSON.stringify({type:'estate-basics-purchase-budget', version:1, budget:state}, null, 2);
    const url = URL.createObjectURL(new Blob([bytes], {type:'application/json'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Estate Basics - Purchase Budget.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
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
