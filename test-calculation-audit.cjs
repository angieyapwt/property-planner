const assert = require('node:assert/strict');
const property = require('./model');
const finance = require('./affordability-model');
const budget = require('./purchase-budget');
const client = require('./client-report');
const lease = require('./lease-ltv-model');

let checks = 0;
function near(actual, expected, tolerance = .011) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
  checks++;
}
function check(condition) { assert.ok(condition); checks++; }
function applicant(age, income, extra = {}) {
  return {...finance.applicant(), age:String(age), ageAuto:false, income:String(income), ...extra};
}

// IRAS residential bands, higher value basis, and whole-dollar duty.
for (const [value, duty] of [[0,0],[1,1],[180000,1800],[360000,5400],
  [1000000,24600],[1500000,44600],[3000000,119600],[4000000,179600]]) {
  near(property.stampDuty(value), duty);
}
near(property.additionalDuty(1350011, 5),67500);
let buy = property.calculate('buy-condo', {
  buyPrice:1350000,buyValuation:1400000,absdRate:5,loanType:'Bank loan'
}).buy;
near(buy.maxLoan,1012500);
near(buy.bsd,40600);
near(buy.absd,70000);
near(buy.stampDutyTotal,110600);

// COV is paid once. A reduced approval can use eligible OA.
const bank = {buyPrice:1350000,buyValuation:1250000,buyLoan:910000,buyCpf:100000,
  buyLegal:3000,buyMisc:1000,buyRate:1,loanType:'Bank loan'};
buy = property.calculate('buy-condo',bank).buy;
near(buy.cov,100000);
near(buy.loanGap,75000);
near(buy.approvalShortfall,27500);
near(buy.cashNeeded,397315);
near(buy.loanUsed+buy.cashNeeded+buy.cpfUsed+buy.grantUsed,
  buy.price+buy.stampDutyTotal+3000+1000+buy.fee);
let report = client.build({price:'1350000',valuation:'1250000',loan:'910000',oa:'100000',years:'25',rateOne:'2'});
check(report.valid);
check(report.totals[0].value === '$397,315');
near(report.split.cash,150000);
near(report.split.cpf,100000);
check(report.purchase.find(row=>row.label==='Loan Shortfall').value==='$27,500');
check(!client.build({price:'1000000',oa:'10000',splitCpf:'200000',years:'25',rateOne:'2'}).valid);
check(!client.build({type:'hdb',financing:'HDB loan',price:'600000',years:'26',oa:'0'}).valid);
check(!client.build({price:'1000000',ltv:'70',years:'25',rateOne:'2'}).valid);
report=client.build({price:'1000000',years:'35',rateOne:'2'});
check(report.highlights[0][1]==='$550,000');
check(report.split.label==='35% Cash / CPF');

// First-loan reduced LTV requires 10% cash. Subsequent loans require 25% cash.
for (const [limit,cashRate] of [[75,.05],[55,.10],[45,.25],[25,.25],[35,.25],[15,.25]]) {
  buy=property.calculate('buy-condo',{buyPrice:1000000,buyValuation:900000,
    buyLtv:limit,buyCpf:1e7,loanType:'Bank loan'}).buy;
  near(buy.maxLoan,900000*limit/100);
  near(buy.cashNeeded,100000+900000*cashRate);
}

// Grants cannot pay duties or legal fees. HDB uses available OA upfront.
buy=property.calculate('buy-hdb',{buyPrice:600000,loanType:'HDB loan',
  buyGrant:1e7,buyLegal:2500,buyCpf:0}).buy;
near(buy.grantUsed,570000);
near(buy.cashNeeded,45100);
buy=property.calculate('buy-hdb',{buyPrice:600000,loanType:'No loan',
  buyGrant:1e7,buyLegal:2500}).buy;
near(buy.cashNeeded,45100);
buy=property.calculate('buy-hdb',{buyPrice:600000,loanType:'HDB loan',buyCpf:300000,buyLegal:2500}).buy;
near(buy.loanUsed,315100);
near(buy.cpfUsed,300000);
near(buy.cashNeeded,0);
buy=property.calculate('buy-hdb',{buyPrice:600000,loanType:'HDB loan',buyCpf:1e7}).buy;
near(buy.loanUsed,0);

// Market-value CPF refund exception is explicit and never waives bank debt or selling costs.
for (const scenario of ['sell-hdb','sell-condo']) {
  const inputs={salePrice:400000,saleLoan:300000,saleCpf:200000,saleLegal:2500,saleAtMarketValue:true};
  const result=property.calculate(scenario,inputs);
  near(result.sale.cpf,100000);
  near(result.sale.cpfShortfall,100000);
  near(result.sale.proceeds,-2500);
  near(property.calculate(scenario,{...inputs,saleAtMarketValue:false}).sale.proceeds,-102500);
}
for (const [proceeds,paydown] of [[0,0],[25000,0],[40000,15000],[50000,25000],[100000,50000]]) {
  const inputs={salePrice:proceeds,buyPrice:600000,loanType:'HDB loan',buyCpf:0};
  near(property.calculate('hdb-to-hdb',inputs).buy.paydown,paydown);
  near(property.calculate('hdb-to-hdb',{...inputs,secondHdbLoan:false}).buy.paydown,0);
}
const pendingSale=property.calculate('hdb-to-hdb',{buyPrice:600000,loanType:'HDB loan',
  salePrice:'',saleLegal:2500,saleMisc:1000,buyLegal:2500,buyMisc:1000});
near(pendingSale.sale.proceeds,0);
const pendingPurchase=property.calculate('hdb-to-hdb',{salePrice:600000,buyPrice:'',
  buyLegal:2500,buyMisc:1000,buyOverride:10000});
near(pendingPurchase.buy.cashNeeded,0);
near(pendingPurchase.buffer,600000);
for(const scenario of Object.keys(property.scenarios)) {
  for(const loanType of ['HDB loan','Bank loan','No loan']) {
    const result=property.calculate(scenario,{buyPrice:600000,buyValuation:550000,buyLoan:300000,
      buyCpf:100000,buyGrant:40000,buyLegal:2500,buyMisc:1000,buyRate:1,
      salePrice:700000,saleLoan:250000,saleCpf:200000,saleAtMarketValue:true,
      saleLegal:2500,saleMisc:1000,saleRate:2,loanType,cashSavings:10000});
    if(result.buy) {
      near(result.buy.requirement,result.buy.cashNeeded+result.buy.cpfUsed+result.buy.grantUsed);
      near(result.topUp-result.buffer,result.buy.cashNeeded-(result.sale?.proceeds||0)-10000);
    }
    check(Number.isFinite(result.primary));
  }
}

// Selected applicants, variable income haircut, stressed debt servicing and term boundaries.
const assessment=finance.defaults();
assessment.settings.asOfAuto=false;
assessment.settings.asOf='2026-11-23';
assessment.applicants=[applicant(35,10000,{annual:'12000',car:'4000'}),applicant(45,5000)];
assessment.settings.selection='0';
let result=finance.assess(assessment);
near(result.income,10700);
near(result.outcomes.hdb.standard.monthlyBudget,1885);
near(result.outcomes.ec.standard.monthlyBudget,1885);
near(result.outcomes.condo.standard.monthlyBudget,1885);
assessment.applicants[0].car='0';
result=finance.assess(assessment);
near(result.outcomes.hdb.standard.monthlyBudget,3210);
near(result.outcomes.condo.standard.monthlyBudget,5885);
check(result.outcomes.hdb.standard.months===300);
check(result.outcomes.condo.standard.months===360);
assessment.settings.selection='pair';
near(finance.assess(assessment).income,15700);
assessment.settings.selection='1';
near(finance.assess(assessment).income,5000);
assessment.settings.selection='0';
assessment.settings.actualRate='5';
near(finance.assess(assessment).stress,5);
for (const rate of [0,1e-12,2,4,15]) {
  const payment=finance.payment(900000,rate,300);
  near(finance.presentValue(payment,rate,300),900000);
  const schedule=finance.amortize(900000,rate,300);
  near(schedule.principalTotal,900000);
  near(schedule.rows.at(-1).balance,0);
  near(schedule.totalPaid,schedule.principalTotal+schedule.interestTotal);
}

// Published CPF tables and birthday-month transitions.
near(finance.cpfOa(applicant(57,6000),'2026-11-23').amount,720.12);
near(finance.cpfOa(applicant(57,6000),'2027-01-01').amount,720.37);
near(finance.cpfOa(applicant(62,6000),'2027-01-01').amount,210.13);
const dob=applicant(35,8000,{ageAuto:true,dob:'1991-12-05'});
near(finance.cpfOa(dob,'2026-12-31').amount,1840.23);
near(finance.cpfOa(dob,'2027-01-01').amount,1680.39);
near(finance.cpfOa(applicant(30,12000),'2026-11-23').amount,1840.23);

// Linked OA growth respects the wage ceiling, age and calendar year.
assessment.applicants=[applicant(20,8000)];
assessment.settings.selection='0';assessment.settings.actualRate='2';
let projection=budget.project({maxLoan:1000000,oaBalance:100000,cashBalance:100000,
  monthlyOa:1840,monthlyCash:1000,salaryIncrease:10},assessment);
for(const row of projection.rows) near(row.monthlyOa,1840.23);
near(projection.rows[10].oa,320827.60);
const birthdayAssessment={...assessment,applicants:[dob]};
projection=budget.project({oaBalance:100000,cashBalance:100000,monthlyOa:1840,monthlyCash:1000},birthdayAssessment);
check(projection.rows[1].monthlyOa<projection.rows[0].monthlyOa);
for (const row of projection.rows) {
  const state={...projection.state,maxLoan:row.maxLoan};
  const costs=budget.purchaseCosts(row.price,state);
  check(budget.cashRequired(costs,row.oa)<=row.cash);
  check(budget.cashRequired(budget.purchaseCosts(row.price+1,state),row.oa)>row.cash);
}

// Independent official example: age 25, 65-year lease implies 90% of baseline LTV.
const ltv=lease.calculate({...lease.defaults(),builtYear:'1992',currentYear:'2026',
  currentYearAuto:false,age:'25',ageAuto:false,price:'550000',valuation:'500000'});
near(ltv.ratio,.9);
near(ltv.loan,337500);
near(lease.cleanState(ltv.state).valuation,500000);

console.log(`${checks} Singapore calculation audit regression checks passed.`);
