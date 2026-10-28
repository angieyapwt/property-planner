/* User-specified lease pro-rating formula, with bounded LTV and explicit assumptions. */
(function(root){
  'use strict';
  const dates=typeof module!=='undefined'&&module.exports?require('./affordability-model.js'):root.AffordabilityModel;
  const n=dates.n,has=dates.has;
  function defaults(){return {skipPlannerPrefill:false,builtYear:'',leaseTerm:'99',currentYear:dates.today().slice(0,4),currentYearAuto:true,dob:'',age:'',ageAuto:true,ltv:'75',price:''};}
  function cleanState(raw){const state=defaults();if(!raw||typeof raw!=='object')return state;for(const key of ['builtYear','leaseTerm','currentYear','age','ltv','price'])if(raw[key]!==undefined)state[key]=has(raw[key])?String(Math.min(n(raw[key]),key==='price'?1e12:9999)):'';state.skipPlannerPrefill=raw.skipPlannerPrefill===true;state.currentYearAuto=raw.currentYearAuto!==false;if(state.currentYearAuto)state.currentYear=dates.today().slice(0,4);state.dob=dates.dateParts(raw.dob)?raw.dob:'';state.ageAuto=raw.ageAuto!==false;return state;}
  function referenceDate(year,today=dates.today()){const parts=dates.dateParts(today);if(!parts||!Number.isInteger(year)||year<1900||year>2200)return null;const month=parts[1],day=Math.min(parts[2],new Date(Date.UTC(year,month,0)).getUTCDate());return String(year)+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');}
  function calculate(raw,today=dates.today()){
    const state=cleanState(raw),year=n(state.currentYear),built=n(state.builtYear),lease=n(state.leaseTerm),base=n(state.ltv),price=n(state.price),date=referenceDate(year,today);
    const age=state.ageAuto&&state.dob?dates.ageFromDob(state.dob,date||today):has(state.age)?n(state.age):null;
    const errors=[];
    if(!has(state.currentYear)||!date)errors.push('Enter a whole current year between 1900 and 2200.');
    if(!has(state.builtYear)||!Number.isInteger(built)||built<1800||built>year)errors.push('Enter a whole built year no later than the current year.');
    if(!has(state.leaseTerm)||lease<=0||lease>999)errors.push('Enter an original lease term between 1 and 999 years.');
    if(age===null||age<0||age>120)errors.push('Enter the youngest buyer’s age or a valid DOB.');
    if(!has(state.ltv)||base>100)errors.push('Enter a current LTV limit from 0% to 100%.');
    const remaining=has(state.builtYear)&&built<=year&&lease>0?Math.max(0,lease-(year-built)):null;
    const coverage=age!==null&&remaining!==null?age+remaining:null,denominator=age===null?null:95-age-20,numerator=remaining===null?null:remaining-20;
    let ratio=null,status='incomplete';
    if(!errors.length){if(remaining<=20){ratio=0;status='short-lease';}else if(coverage>=95){ratio=1;status='full';}else if(denominator>0){ratio=Math.max(0,Math.min(1,numerator/denominator));status='pro-rated';}else errors.push('The formula denominator is not positive. Check the age and remaining lease.');}
    const prorated=ratio===null?null:ratio*base,loan=prorated===null||!has(state.price)?null:price*prorated/100;
    const fullLoan=has(state.price)?price*base/100:null,loanDifference=loan===null?null:Math.max(fullLoan-loan,0);
    return {fullLoan,loanDifference,state,year,built,lease,base,price,date,age,remaining,coverage,denominator,numerator,ratio,prorated,loan,status,errors,valid:!errors.length};
  }
  const api={defaults,cleanState,referenceDate,calculate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LeaseLtvModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
