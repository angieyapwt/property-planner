/* Bank-loan planning rules checked against MAS and CPF Board on 28 Oct 2026. */
(function(root){
  'use strict';
  const n=v=>Math.max(Number(String(v??'').replace(/[^\d.-]/g,''))||0,0);
  const has=v=>/\d/.test(String(v??''));
  const cents=v=>Math.round((v+Number.EPSILON)*100)/100;
  function today(){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(k=>p.find(v=>v.type===k).value).join('-');}
  function dateParts(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return null;const p=s.split('-').map(Number),d=new Date(Date.UTC(p[0],p[1]-1,p[2]));return d.getUTCFullYear()===p[0]&&d.getUTCMonth()===p[1]-1&&d.getUTCDate()===p[2]?p:null;}
  function ageFromDob(dob,asOf=today()){const b=dateParts(dob),d=dateParts(asOf);if(!b||!d||dob>asOf)return null;return d[0]-b[0]-(d[1]<b[1]||(d[1]===b[1]&&d[2]<b[2])?1:0);}
  function applicant(){return {name:'',dob:'',age:'',ageAuto:true,income:'',incomeType:'fixed',annual:'',annualType:'variable',cpfProfile:'full',frsMet:false,oa:'',oaAuto:true,car:'',card:'',other:'',housing:''};}
  function defaults(){return {version:1,name:'',notes:'',applicants:[applicant()],settings:{asOf:today(),selection:'all',property:'hdb',ecType:'new',stressRate:'4',thereafterRate:'',actualRate:'',maxMaturity:'75',existingLoans:'0',standardYears:'',extendedYears:'',term:'standard',loan:''},targets:{hdb:{price:'',valuation:'',loan:''},ec:{price:'',valuation:'',loan:''},condo:{price:'',valuation:'',loan:''}}};}
  function cleanState(raw){
    const state=defaults();if(!raw||typeof raw!=='object')return state;
    state.name=String(raw.name??'').slice(0,80);state.notes=String(raw.notes??'').slice(0,4000);
    if(Array.isArray(raw.applicants)&&raw.applicants.length)state.applicants=raw.applicants.slice(0,8).map(r=>{const a=applicant();if(!r||typeof r!=='object')return a;for(const k of Object.keys(a)){if(r[k]===undefined)continue;if(['ageAuto','oaAuto','frsMet'].includes(k))a[k]=r[k]===true;else if(k==='name')a[k]=String(r[k]).slice(0,60);else if(k==='dob')a[k]=dateParts(r[k])?r[k]:'';else if(k==='cpfProfile')a[k]=['full','none','manual'].includes(r[k])?r[k]:'full';else if(k.endsWith('Type'))a[k]=r[k]==='variable'?'variable':'fixed';else a[k]=has(r[k])?String(Math.min(n(r[k]),1e10)):'';}return a;});
    const s=raw.settings||{};
    for(const k of ['stressRate','thereafterRate','actualRate','maxMaturity','existingLoans','standardYears','extendedYears','loan'])if(s[k]!==undefined)state.settings[k]=has(s[k])?String(Math.min(n(s[k]),k==='loan'?1e10:100)):'';
    state.settings.asOfAuto=s.asOfAuto!==false;
    if(!state.settings.asOfAuto&&dateParts(s.asOf))state.settings.asOf=s.asOf;
    if(['hdb','ec','condo'].includes(s.property))state.settings.property=s.property;
    state.settings.ecType=s.ecType==='resale'?'resale':'new';state.settings.selection=String(s.selection??'all');state.settings.term=s.term==='extended'?'extended':'standard';
    for(const type of ['hdb','ec','condo'])for(const k of ['price','valuation','loan'])if(raw.targets?.[type]?.[k]!==undefined)state.targets[type][k]=has(raw.targets[type][k])?String(Math.min(n(raw.targets[type][k]),1e12)):'';
    return state;
  }
  function cpfOa(a,asOf=today()){
    const age=a.ageAuto!==false&&a.dob?ageFromDob(a.dob,asOf):has(a.age)?n(a.age):null;
    if(a.oaAuto===false)return {amount:n(a.oa),age,manual:true};
    if(a.cpfProfile==='none')return {amount:0,age,manual:false};
    if(a.cpfProfile==='manual'||age===null)return {amount:0,age,needsManual:a.cpfProfile==='manual'};
    let bandAge=age;
    if(a.ageAuto!==false&&dateParts(a.dob)){
      const b=dateParts(a.dob),d=dateParts(asOf),months=(d[0]-b[0])*12+d[1]-b[1];
      bandAge=months/12; // A new contribution band starts the month after the birthday.
    }
    const allocation=bandAge<=35?[.1621,.2162]:bandAge<=45?[.1891,.2432]:bandAge<=50?[.2162,.2702]:bandAge<=55?[.3108,.2837]:bandAge<=60?[.3382,.3088]:bandAge<=65?[.44,.42]:bandAge<=70?[.303,.6363]:[.08,.84];
    const employer=bandAge<=55?.17:bandAge<=60?.16:bandAge<=65?.125:bandAge<=70?.09:.075;
    const totalRate=bandAge<=55?.37:bandAge<=60?.34:bandAge<=65?.25:bandAge<=70?.165:.125;
    const lowFactor=bandAge<=55?.6:bandAge<=60?.54:bandAge<=65?.375:bandAge<=70?.225:.15;
    const wage=Math.min(n(a.income),8000);
    const contribution=wage<=50?0:Math.round(wage<=500?wage*employer:wage<=750?wage*employer+lowFactor*(wage-500):wage*totalRate);
    const ma=cents(contribution*allocation[1]),retirement=age>=55&&a.frsMet?0:cents(contribution*allocation[0]);
    return {amount:cents(contribution-ma-retirement),age,bandAge,contribution,manual:false,yearSupported:asOf.slice(0,4)==='2026'};
  }
  function applicantValues(a,asOf){
    const cpf=cpfOa(a,asOf),monthly=n(a.income),annual=n(a.annual)/12;
    return {age:cpf.age,cpf:cpf.amount,gross:monthly+annual,recognized:monthly*(a.incomeType==='variable'?.7:1)+annual*(a.annualType==='variable'?.7:1),debt:n(a.car)+n(a.card)+n(a.other)+n(a.housing),housing:n(a.housing)};
  }
  function selectedIndices(state){const s=state.settings.selection;return s==='pair'?[0,1].filter(i=>i<state.applicants.length):/^\d+$/.test(s)&&+s<state.applicants.length?[+s]:state.applicants.map((_,i)=>i);}
  function payment(principal,rate,months){const p=n(principal),r=n(rate)/1200,m=Math.max(0,Math.floor(months));if(!m||!p)return 0;return r?p*r/(1-Math.pow(1+r,-m)):p/m;}
  function presentValue(monthly,rate,months){const r=n(rate)/1200,m=Math.max(0,Math.floor(months));return !m?0:r?n(monthly)*(1-Math.pow(1+r,-m))/r:n(monthly)*m;}
  function amortize(principal,rate,months){
    const length=Math.max(0,Math.min(420,Math.floor(months))),r=n(rate)/1200,pay=cents(payment(principal,rate,length));let balance=cents(n(principal)),interestTotal=0,principalTotal=0;const rows=[];
    for(let month=1;month<=length&&balance>0;month++){const opening=balance,interest=cents(opening*r),principal=month===length?opening:Math.min(opening,Math.max(cents(pay-interest),0)),instalment=cents(principal+interest);balance=cents(opening-principal);principalTotal=cents(principalTotal+principal);interestTotal=cents(interestTotal+interest);rows.push({month,opening,payment:instalment,principal,interest,balance});}
    return {rows,payment:rows[0]?.payment||0,principalTotal,interestTotal,totalPaid:cents(principalTotal+interestTotal)};
  }
  function assess(raw){
    const state=cleanState(raw),s=state.settings,indices=selectedIndices(state),values=indices.map(i=>applicantValues(state.applicants[i],s.asOf));
    const sum=k=>values.reduce((v,a)=>v+a[k],0),gross=sum('gross'),income=sum('recognized'),debt=sum('debt'),housing=sum('housing'),oa=sum('cpf');
    const validAges=values.length>0&&values.every(v=>v.age!==null&&v.age>=18&&v.age<=100);
    const age=validAges?(gross?values.reduce((total,v)=>total+v.age*v.gross,0)/gross:Math.max(...values.map(v=>v.age))):null;
    const stress=Math.max(4,n(s.stressRate),n(s.actualRate),n(s.thereafterRate));
    const tdsrHeadroom=Math.max(income*.55-debt,0),msrHeadroom=Math.max(income*.30-housing,0),count=Math.min(2,Math.floor(n(s.existingLoans)));
    const normalLtv=[.75,.45,.35][count],reducedLtv=[.55,.25,.15][count],bankMaturity=Math.min(85,Math.max(65,n(s.maxMaturity)||75));
    const outcomes={};
    for(const type of ['hdb','ec','condo']){
      const publicFlat=type==='hdb',msr=publicFlat||(type==='ec'&&s.ecType!=='resale'),normalYears=publicFlat?25:30,maxYears=publicFlat?30:35;
      const monthlyBudget=msr?Math.min(tdsrHeadroom,msrHeadroom):tdsrHeadroom;
      const availableStandard=validAges?Math.max(0,Math.min(normalYears*12,Math.floor((65-age)*12+1e-8))):0;
      const availableExtended=validAges?Math.max(0,Math.min(maxYears*12,Math.floor((bankMaturity-age)*12+1e-8))):0;
      const target=state.targets[type],price=n(target.price),valuation=has(target.valuation)?n(target.valuation):price,hasTarget=has(target.price)&&price>0;
      const build=(extended)=>{
        const available=extended?availableExtended:availableStandard,requested=extended?s.extendedYears:s.standardYears;
        const months=has(requested)?Math.min(available,Math.floor(n(requested)*12)):available;
        const lower=(extended&&months===0)||months>normalYears*12||(age!==null&&age+months/12>65+1e-8),ltv=lower?reducedLtv:normalLtv;
        const capacity=income>0?Math.floor(presentValue(monthlyBudget,stress,months)):0;
        const propertyCap=hasTarget?Math.floor(Math.min(price,valuation)*ltv):null;
        const maxLoan=months>0?Math.max(0,Math.min(capacity,propertyCap??Infinity)):0;
        const cashRate=count>0?.25:ltv===.75?.05:.10;
        const cov=hasTarget?Math.max(price-valuation,0):0;
        return {months,availableMonths:available,ltv,capacity,maxLoan,propertyCap,impliedValue:ltv?capacity/ltv:0,minCash:hasTarget?Math.min(price,valuation)*cashRate+cov:0,equity:hasTarget?Math.max(price-maxLoan,0):0,monthlyBudget,msr,stress,binding:msr&&msrHeadroom<=tdsrHeadroom?'MSR':'TDSR',valid:validAges&&income>0&&months>0};
      };
      outcomes[type]={standard:build(false),extended:build(true),price,valuation,hasTarget,msr};
    }
    const property=outcomes[s.property],option=property[s.term],loan=has(s.loan)?n(s.loan):option.maxLoan,actualEntered=has(s.actualRate),schedule=amortize(loan,n(s.actualRate),option.months);
    const stressedPayment=payment(loan,stress,option.months),tdsr=income?(debt+stressedPayment)/income:0,msr=income?(housing+stressedPayment)/income:0;
    return {state,indices,values,gross,income,debt,housing,oa,age,validAges,stress,tdsrHeadroom,msrHeadroom,bankMaturity,outcomes,property,option,loan,actualEntered,schedule,stressedPayment,tdsr,msr,within:option.valid&&loan<=option.maxLoan&&tdsr<=.55+1e-7&&(!option.msr||msr<=.30+1e-7),cashMonthly:Math.max(schedule.payment-oa,0),higherRatePayment:payment(loan,n(s.actualRate)+1,option.months)};
  }
  const api={n,has,cents,today,dateParts,ageFromDob,applicant,defaults,cleanState,cpfOa,applicantValues,selectedIndices,payment,presentValue,amortize,assess};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AffordabilityModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
