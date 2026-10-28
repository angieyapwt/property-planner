const assert=require('node:assert/strict'),M=require('./affordability-model'),L=require('./lease-ltv-model');
let checks=0;const eq=(a,b)=>{assert.equal(a,b);checks++;};
const applicant=(age,income)=>({...M.applicant(),age:String(age),ageAuto:false,income:String(income)});
for(const [incomeA,incomeB,raw,rounded,months]of [[6900,3100,36.2,37,336],[7000,3000,36,36,348],[6999,3001,36.002,37,336],[10000,0,30,30,360]]){
  const state=M.defaults();state.applicants=[applicant(30,incomeA),applicant(50,incomeB)];state.settings.property='condo';const r=M.assess(state);
  assert.ok(Math.abs(r.rawAge-raw)<1e-9);checks++;eq(r.age,rounded);eq(r.option.months,months);eq(r.option.capacity,Math.floor(M.presentValue(r.option.monthlyBudget,r.stress,months)));
}
let state=M.defaults();state.applicants=[applicant(64,1),applicant(65,99)];let r=M.assess(state);eq(r.age,65);eq(r.option.months,0);eq(r.option.valid,false);
state=M.defaults();state.skipPlannerPrefill=true;const restored=M.simplifyState(JSON.parse(JSON.stringify(state)));eq(restored.skipPlannerPrefill,true);eq(restored.applicants.length,1);eq(restored.applicants[0].income,'');eq(restored.settings.stressRate,'4');eq(restored.settings.maxMaturity,'65');
const ltv=L.defaults();ltv.skipPlannerPrefill=true;const restoredLtv=L.cleanState(JSON.parse(JSON.stringify(ltv)));eq(restoredLtv.skipPlannerPrefill,true);eq(restoredLtv.builtYear,'');eq(restoredLtv.price,'');eq(restoredLtv.leaseTerm,'99');eq(restoredLtv.ltv,'75');eq(L.calculate(restoredLtv).loan,null);
console.log(checks+' IWAA rounding / tenure / fresh-state persistence checks passed.');
