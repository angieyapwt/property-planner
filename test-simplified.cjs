const assert=require('node:assert/strict');
const M=require('./affordability-model');let checks=0;
const eq=(a,b)=>{assert.equal(a,b);checks++;};
const near=(a,b)=>{assert.ok(Math.abs(a-b)<.01,`${a} != ${b}`);checks++;};
let raw=M.defaults();delete raw.workspaceVersion;
raw.settings={...raw.settings,maxMaturity:'75',existingLoans:'2',thereafterRate:'7',ecType:'resale',term:'extended'};
raw.applicants=[{...M.applicant(),age:'40',ageAuto:false,income:'6000',annual:'24000',annualType:'fixed',housing:'2000',cpfProfile:'none',frsMet:true}];
raw.targets.hdb={price:'300000',valuation:'250000',loan:''};
let state=M.simplifyState(raw),r=M.assess(state);
eq(state.settings.maxMaturity,'65');eq(state.settings.existingLoans,'0');eq(state.settings.ecType,'new');eq(state.settings.thereafterRate,'');eq(state.settings.term,'standard');
eq(state.applicants[0].annualType,'variable');eq(state.applicants[0].cpfProfile,'full');eq(state.applicants[0].frsMet,false);eq(state.applicants[0].housing,'');
eq(r.income,7400);eq(r.debt,0);eq(r.stress,4);eq(r.outcomes.ec.msr,true);eq(r.option.ltv,.75);eq(r.option.months,300);eq(r.property.hasTarget,false);
eq(r.option.maxLoan,Math.floor(M.presentValue(7400*.3,4,300)));
state.applicants.push({...M.applicant(),age:'30',ageAuto:false,income:'4000'});
for(const [selection,income]of [['0',7400],['1',4000],['pair',11400]]){state.settings.selection=selection;r=M.assess(state);eq(r.income,income);assert.ok(r.age+r.outcomes.hdb.standard.months/12<=65);checks++;}
state.settings.maxMaturity='75';state.settings.term='extended';state.settings.property='hdb';r=M.assess(state);eq(r.option.ltv,.55);eq(r.option.months,360);
const restored=M.simplifyState(JSON.parse(JSON.stringify(state)));eq(restored.settings.maxMaturity,'75');eq(restored.settings.term,'standard');eq(restored.settings.selection,'pair');
state.applicants[0].oaAuto=false;state.applicants[0].oa='456.78';near(M.assess(M.simplifyState(state)).values[0].cpf,456.78);
for(const [loan,ltv,price,cash]of [[450000,.75,600000,30000],[330000,.55,600000,60000],[0,.75,0,0]]){const b=M.propertyBudget(loan,ltv);near(b.price,price);near(b.minCash,cash);near(b.equity,price-loan);near(b.cpfOrCash+b.minCash,b.equity);}
near(M.propertyBudget(600000,.75).price,800000);eq(M.propertyBudget(450000,0).price,0);
console.log(checks+' simplified assessment / saved-state / property budget checks passed.');
