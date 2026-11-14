/* Work backwards from a loan limit, eligible OA savings and cash. */
((root) => {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const property = isNode ? require('./model') : root.PropertyModel;
  const affordability = isNode ? require('./affordability-model') : root.AffordabilityModel;
  const defaults = {
    propertyType: 'private', maxLoan: '', oaBalance: '', cashBalance: '',
    monthlyOa: '', monthlyCash: '', salaryIncrease: '0', absdRate: '0', targetPrice: ''
  };
  const cents = amount => Math.round(amount * 100) / 100;
  const money = new Intl.NumberFormat('en-SG', {style:'currency', currency:'SGD', maximumFractionDigits:0});
  const format = amount => money.format(amount);
  const period = year => year === 0 ? 'Now' : 'Year ' + year;
  const propertyNames = {hdb:'HDB', ec:'Executive Condominium', private:'Private residential'};
  const amountKeys = Object.keys(defaults).filter(key => key !== 'propertyType');
  const parse = value => String(value ?? '').replace(/[$,\s]/g,'');
  const withinRange = (value,key) => value === '' || (/^\d+(?:\.\d+)?$/.test(value) &&
    Number(value) <= (key === 'absdRate' || key === 'salaryIncrease' ? 100 : 1e9));

  function clean(raw = {}) {
    const state = {...defaults};
    if (['hdb', 'ec', 'private'].includes(raw.propertyType)) state.propertyType = raw.propertyType;
    for (const key of amountKeys) {
      const value = parse(raw[key]);
      if (value && withinRange(value,key)) {
        state[key] = String(key === 'salaryIncrease' ? cents(Number(value)) : Math.round(Number(value)));
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

  function projectedLoan(assessment, propertyType, year, growth) {
    const type = propertyType === 'private' ? 'condo' : propertyType;
    const applicants = assessment.applicants.map(applicant => {
      const {age} = affordability.applicantValues(applicant, assessment.settings.asOf);
      return {
        ...applicant, ageAuto:false, age:age === null ? '' : age + year,
        income:(affordability.n(applicant.income) * growth).toFixed(2)
      };
    });
    const result = affordability.assess({...assessment, applicants, settings:{...assessment.settings, property:type}});
    const option = result.outcomes[type].standard;
    return option.valid ? option.maxLoan : 0;
  }

  function project(raw, assessment) {
    const state = clean(raw);
    const targetPrice = Number(state.targetPrice);
    const annualGrowth = 1 + Number(state.salaryIncrease) / 100;
    let oa = Number(state.oaBalance);
    let cash = Number(state.cashBalance);
    const rows = Array.from({length: 11}, (_, year) => {
      // The first raise is after 12 months, so Year 1 uses today's monthly savings.
      const growth = annualGrowth ** Math.max(0, year - 1);
      const monthlyOa = cents(Number(state.monthlyOa) * growth);
      const monthlyCash = cents(Number(state.monthlyCash) * growth);
      if (year > 0) {
        oa = cents(oa + monthlyOa * 12);
        cash = cents(cash + monthlyCash * 12);
      }
      const maxLoan = assessment
        ? projectedLoan(assessment, state.propertyType, year, annualGrowth ** year)
        : Number(state.maxLoan);
      const funding = {...state, maxLoan};
      const target = targetPrice > 0 ? purchaseCosts(targetPrice, funding) : null;
      const price = maxPrice(funding, oa, cash);
      const targetBalance = target ? cents(cash - cashRequired(target, oa)) : null;
      return {year, monthlyOa, oa, cash, price, maxLoan, target, targetBalance};
    });
    return {
      state, target:rows[0].target, rows,
      benchmark:purchaseCosts(Math.floor(rows[0].maxLoan / .75), {...state, maxLoan:rows[0].maxLoan})
    };
  }

  function signedBalance(amount) {
    if (amount < 0) return {text:'-'+format(Math.ceil(-amount)), tone:'budget-gap'};
    if (amount > 0) return {text:'+'+format(Math.floor(amount)), tone:'budget-funded'};
    return {text:format(0), tone:'budget-funded'};
  }

  function reportData(raw, selectedYear, assessment) {
    const {state, benchmark, rows} = project(raw, assessment);
    const year = rows[selectedYear] || rows[0];
    const target = year.target;
    const firstCovered = target && rows.find(row => row.targetBalance >= 0);
    const timing = !target ? 'Enter a target price to track the funding gap.'
      : firstCovered ? 'Target funded ' + (firstCovered.year === 0 ? 'now' : 'by Year ' + firstCovered.year) + '.'
      : 'Target still needs a top-up in Year 10.';
    const funding = {...state, maxLoan:year.maxLoan};
    const available = purchaseCosts(year.price, funding);
    const loanBenchmark = purchaseCosts(Math.floor(year.maxLoan / .75), funding);
    const scenarios = [loanBenchmark, available, ...(target ? [target] : [])];
    const costLines = [
      ['Purchase price', 'price'], ['Loan used', 'loan'], ['Downpayment (25%)', 'downpayment'],
      ['Extra downpayment above 25%', 'extraEquity'], ['Buyer’s Stamp Duty (BSD)', 'bsd'],
      ['Additional Buyer’s Stamp Duty (ABSD)', 'absd'], ['Agent service fee (1% + 9% GST)', 'agent'],
      ['Legal fees', 'legal'], ['Miscellaneous fees', 'misc'], ['Total outlay (cash + CPF)', 'outlay'],
      ['Cash needed after CPF', costs => cashRequired(costs, year.oa)]
    ];
    return {
      state, year, target, timing, now:format(rows[0].price), benchmark:format(benchmark.price),
      salaryIncrease: Number(state.salaryIncrease) + '%',
      loanProjectionNote: assessment
        ? 'Each year-end Max Loan uses projected salary and age, with other lending inputs held fixed.'
        : 'Max Loan is held fixed. Link an Affordability Assessment to project future loan limits.',
      propertyType:propertyNames[state.propertyType], targetToday:target ? signedBalance(rows[0].targetBalance) : null,
      yearLabel:period(year.year), affordablePrice:format(year.price),
      projectionHeaders:['When','Monthly CPF OA','Accumulated CPF OA','Cash savings','Max Loan','Max purchase price',...(target ? ['Target cash balance'] : [])],
      projectionRows:rows.map(row => ({
        year:row.year, label:period(row.year), values:[row.monthlyOa,row.oa,row.cash,row.maxLoan,row.price].map(format),
        balance:target ? signedBalance(row.targetBalance) : null, key:row.year === 0
      })),
      costHeaders:['Amount','Loan benchmark','Affordable · '+period(year.year),...(target ? ['At target price'] : [])],
      costRows:costLines.filter(([, key]) => key !== 'extraEquity' || scenarios.some(costs => costs.extraEquity > 0))
        .map(([label, key]) => ({label, key:key === 'outlay', values:scenarios.map(costs => format(typeof key === 'function' ? key(costs) : costs[key]))})),
      targetForYear: target ? signedBalance(year.targetBalance) : null,
      cash:format(year.cash), oa:format(year.oa), maxLoan:format(year.maxLoan),
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
    const selectedYear = Number($('purchaseBudgetYear').value);
    const data = reportData(state, selectedYear, linked ? root.EstateAffordability.getState() : null);
    $('purchaseBudgetNow').textContent = data.now;
    $('purchaseBudgetBenchmark').textContent = data.benchmark;
    showBalance($('purchaseBudgetTarget'), data.targetToday);
    $('purchaseBudgetTiming').textContent = data.timing;
    $('purchaseBudgetTargetHeading').hidden = !data.target;
    $('purchaseBudgetProjection').innerHTML = data.projectionRows.map(row =>
      `<tr data-budget-year="${row.year}" class="${row.year === selectedYear ? 'budget-selected' : ''}"><th scope="row"><button type="button" class="budget-year-button" aria-label="Show purchase budget for ${row.label}" aria-pressed="${row.year === selectedYear}">${row.label}</button></th>` +
      row.values.map((value,index) => index >= 3 ? `<td><strong>${value}</strong></td>` : `<td>${value}</td>`).join('') +
      (row.balance ? `<td class="${row.balance.tone}">${row.balance.text}</td>` : '') + '</tr>').join('');

    $('purchaseBudgetCostsTitle').textContent = 'Purchase cost breakdown · ' + data.yearLabel;
    $('purchaseBudgetYearPrice').textContent = data.affordablePrice;
    $('purchaseBudgetYearLoan').textContent = data.maxLoan;
    $('purchaseBudgetYearTargetTile').hidden = !data.targetForYear;
    showBalance($('purchaseBudgetYearTarget'), data.targetForYear);
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
  $('purchaseBudgetProjection').addEventListener('click', event => {
    const row = event.target.closest('tr[data-budget-year]');
    if (!row) return;
    $('purchaseBudgetYear').value = row.dataset.budgetYear;
    render();
    const heading = $('purchaseBudgetCostsTitle');
    heading.focus({preventScroll:true});
    heading.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  });
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
    const data = reportData(state, Number($('purchaseBudgetYear').value), linked ? root.EstateAffordability.getState() : null);
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
