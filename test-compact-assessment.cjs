const assert=require('node:assert/strict'),M=require('./affordability-model'),L=require('./lease-ltv-model');
let checks=0;const eq=(a,b)=>{assert.equal(a,b);checks++;};
let state=M.simplifyState(M.defaults());state.applicants[0]={...M.applicant(),age:'35',ageAuto:false,income:'10000'};
let r=M.assess(state);eq(r.outcomes.hdb.standard.binding,'MSR');eq(r.outcomes.ec.standard.binding,'MSR');eq(r.outcomes.condo.standard.binding,'TDSR');eq(r.outcomes.hdb.standard.monthlyBudget,3000);eq(r.outcomes.ec.standard.monthlyBudget,3000);eq(r.outcomes.condo.standard.monthlyBudget,5500);
state.applicants[0].car='4000';r=M.assess(state);eq(r.outcomes.hdb.standard.binding,'TDSR');eq(r.outcomes.ec.standard.binding,'TDSR');eq(r.outcomes.hdb.standard.monthlyBudget,1500);eq(r.outcomes.ec.standard.monthlyBudget,1500);eq(r.outcomes.condo.standard.monthlyBudget,1500);
const saved=JSON.parse(JSON.stringify({type:'estate-basics-affordability',version:1,assessment:state}));const restored=M.simplifyState(saved.assessment);eq(restored.applicants[0].car,'4000');eq(restored.settings.term,'standard');eq(restored.settings.maxMaturity,'65');
const lease=L.calculate({...L.defaults(),builtYear:'1992',currentYear:'2026',currentYearAuto:false,age:'25',ageAuto:false,price:'550000'});eq(lease.fullLoan,412500);eq(lease.loan,371250);eq(lease.loanDifference,41250);eq(lease.prorated,67.5);
const full=L.calculate({...lease.state,age:'30'});eq(full.loanDifference,0);eq(full.loan,full.fullLoan);
console.log(checks+' MSR/TDSR, portable save and LTV comparison checks passed.');
