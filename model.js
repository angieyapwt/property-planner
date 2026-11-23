/* Shared calculation engine. All amounts are in SGD. */
(function (root) {
  'use strict';
  const scenarios = {
    'buy-hdb': {label:'Buy an HDB', buy:'hdb', description:'Plan your HDB purchase, from valuation to the cash you need.'},
    'sell-hdb': {label:'Sell an HDB', sell:'hdb', description:'See what remains after your loan, CPF refund and selling costs.'},
    'hdb-to-hdb': {label:'Sell HDB → Buy HDB', sell:'hdb', buy:'hdb', description:'Bring both sides of your next HDB move into one clear view.'},
    'hdb-to-condo': {label:'Sell HDB → Buy condo', sell:'hdb', buy:'condo', description:'Explore your condo upgrade with sale proceeds and purchase costs together.'},
    'buy-condo': {label:'Buy a condo', buy:'condo', description:'Understand the loan, stamp duties and funds for your condo purchase.'},
    'sell-condo': {label:'Sell a condo', sell:'condo', description:'Estimate your condo sale proceeds after deductions and fees.'},
    'condo-to-condo': {label:'Sell condo → Buy condo', sell:'condo', buy:'condo', description:'Plan your next condo move with a complete sale and purchase estimate.'},
  };
  const n = v => Math.max(Number(String(v ?? '').replace(/[^\d.-]/g,'')) || 0, 0);
  const has = v => /\d/.test(String(v ?? ''));
  function stampDuty(amount) {
    let remaining=n(amount), total=0;
    for (const [cap,rate] of [[180000,.01],[180000,.02],[640000,.03],[500000,.04],[1500000,.05],[Infinity,.06]]) {
      const taxable=Math.min(remaining,cap); total+=taxable*rate; remaining-=taxable;
      if(remaining<=0) break;
    }
    return n(amount)>0?Math.max(1,Math.floor(total+1e-8)):0;
  }
  function additionalDuty(amount,rate) {
    return n(amount)>0&&n(rate)>0?Math.max(1,Math.floor(n(amount)*n(rate)/100+1e-8)):0;
  }
  function loanRules(isHdb,loanType,limit) {
    const entered=has(limit)?n(limit):75;
    const ltv=loanType==='No loan'?0:loanType==='HDB loan'&&isHdb?Math.min(75,entered)/100:
      ([75,55,45,35,25,15].includes(entered)?entered:75)/100;
    const cashRate=loanType!=='Bank loan'?0:ltv===.75?.05:ltv===.55?.10:.25;
    return {ltv,cashRate};
  }
  function commission(price, rate, on, override, withGst = true) {
    return on === false ? 0 : has(override) ? n(override) : n(price)*n(rate)/100*(withGst ? 1.09 : 1);
  }
  const row=(label,value,kind='')=>({label,value,kind});
  function calculate(scenario, d={}) {
    const config=scenarios[scenario] || scenarios['buy-hdb'];
    let sale=null,buy=null;
    if(config.sell) {
      const price=n(d.salePrice), loan=n(d.saleLoan), cpfRequired=n(d.saleCpf),
        cpf=d.saleAtMarketValue===true?Math.min(cpfRequired,Math.max(price-loan,0)):cpfRequired,
        hip=config.sell==='hdb'?n(d.saleHip):0, levy=config.sell==='hdb'?n(d.saleLevy):0,
        ssd=n(d.saleSsd), penalty=n(d.salePenalty),
        legal=has(d.salePrice)?n(d.saleLegal):0, misc=has(d.salePrice)?n(d.saleMisc):0,
        fee=has(d.salePrice)?commission(price,d.saleRate,d.saleCommissionOn,d.saleOverride,d.saleCommissionGst!==false):0;
      const proceeds=price-loan-cpf-hip-levy-ssd-penalty-legal-misc-fee;
      sale={price,loan,cpf,cpfRequired,cpfShortfall:cpfRequired-cpf,proceeds,rows:[row('Selling price',price),row('Outstanding loan',-loan),row('CPF refund with accrued interest',-cpf),
        ...(cpfRequired>cpf?[row('CPF refund shortfall waived for market-value sale',cpfRequired-cpf,'guide')]:[]),
        ...(config.sell==='hdb'?[row('Outstanding HIP',-hip),row('Resale levy',-levy)]:[]),row('Seller stamp duty',-ssd),
        row('Bank penalty',-penalty),row('Legal fee',-legal),row('Miscellaneous fee',-misc),row(d.saleCommissionGst===false?'Agent commission (without GST)':'Commission including GST',-fee),row('Estimated sale proceeds',proceeds,'total')]};
    }
    if(config.buy) {
      const isHdb=config.buy==='hdb', price=n(d.buyPrice), valuation=has(d.buyValuation)?n(d.buyValuation):price;
      const basis=Math.min(price,valuation), stampBasis=Math.max(price,valuation);
      const loanType=d.loanType==='No loan'?'No loan':isHdb&&d.loanType==='HDB loan'?'HDB loan':'Bank loan';
      const {ltv,cashRate}=loanRules(isHdb,loanType,d.buyLtv);
      const maxLoan=basis*ltv;
      const requestedLoan=d.buyLoanAuto===true || !has(d.buyLoan) ? price*ltv : n(d.buyLoan);
      const bsd=price>0?stampDuty(stampBasis):0,absd=price>0?additionalDuty(stampBasis,d.absdRate):0,
        legal=price>0?n(d.buyLegal):0,misc=price>0?n(d.buyMisc):0;
      const cashDown=basis*cashRate,grantAvailable=isHdb?Math.min(n(d.buyGrant),basis*.95):0;
      const cpfForPurchase=loanType==='HDB loan'?Math.max(n(d.buyCpf)-bsd-absd-legal,0):0;
      const ownContribution=loanType==='HDB loan'&&basis>0&&grantAvailable>=basis*.95?basis*.05:0;
      const loan=Math.min(requestedLoan,maxLoan,Math.max(basis-cashDown-grantAvailable-Math.max(cpfForPurchase,ownContribution),0));
      const approvalShortfall=Math.max(maxLoan-Math.min(requestedLoan,maxLoan),0);
      const cpfLoanReduction=Math.max(Math.min(requestedLoan,maxLoan)-loan,0);
      const paydownApplicable=isHdb && !!sale && loanType==='HDB loan' && d.secondHdbLoan!==false;
      const positiveProceeds=Math.max(sale?.proceeds||0,0);
      const automaticPaydown=Math.max(0,Math.min(positiveProceeds*.5,positiveProceeds-25000));
      const paydown=paydownApplicable?Math.min(has(d.buyPaydown)?n(d.buyPaydown):automaticPaydown,loan):0;
      const loanUsed=loan-paydown, cov=Math.max(price-valuation,0);
      const fee=price>0?commission(price,d.buyRate,d.buyCommissionOn,d.buyOverride,d.buyCommissionGst!==false):0;
      const stampDutyTotal=bsd+absd;
      const requirement=price-loanUsed+stampDutyTotal+legal+misc+fee;
      const cashOnly=cov+cashDown+misc+fee+paydown;
      const cpfEligible=Math.max(requirement-cashOnly,0);
      const grantUsed=Math.min(grantAvailable,Math.max(basis-loanUsed-cashDown-paydown,0));
      const cpfUsed=Math.min(n(d.buyCpf),Math.max(cpfEligible-grantUsed,0));
      const cashNeeded=cashOnly+Math.max(cpfEligible-grantUsed-cpfUsed,0);
      const loanGap=Math.max(price-valuation,0)*ltv;
      const ltvLabel=String(Math.round(ltv*10000)/100)+'%';
      const downpaymentLabel=String(Math.round((1-ltv)*10000)/100)+'% downpayment by cash / CPF';
      const downRows=loanType==='No loan'?[row('Purchase without a loan',price,'guide')]:[
        row(downpaymentLabel,basis*(1-ltv),'guide'),
        ...(loanType==='Bank loan'?[row((cashRate*100)+'% cash downpayment',cashDown,'guide')]:[])
      ];
      buy={price,valuation,basis,ltv,cashRate,loan,maxLoan,loanUsed,paydown,cov,loanGap,approvalShortfall,cpfLoanReduction,bsd,absd,stampDutyTotal,fee,requirement,grantUsed,cpfUsed,cashOnly,cashNeeded,
        rows:[row('Purchase price',price),row('Valuation / market value',valuation),
          ...(loanType==='No loan'?[]:[row(ltvLabel+' loan of property price',price*ltv,'guide')]),row('Maximum loan at '+ltvLabel+' of lower price / valuation',maxLoan,'guide'),
          row('Cash top-up from lower valuation',loanGap,'guide'),...(approvalShortfall>0?[row('Loan Shortfall',approvalShortfall,'guide')]:[]),
          ...(cpfLoanReduction>0?[row('Loan reduction from upfront CPF / grants',cpfLoanReduction,'guide')]:[]),
          ...(paydownApplicable?[row('Second HDB loan proceeds paydown',paydown),row('Net loan after paydown',-loanUsed,'guide')]:[]),
          row('Cash-over-valuation (cash only)',cov,'guide'),...downRows,
          row('Stamp duty basis',stampBasis,'guide'),row('Buyer stamp duty',bsd),row('ABSD ('+n(d.absdRate)+'%)',absd),
          row('Total Stamp Duty',stampDutyTotal,'subtotal'),row('Legal fee',legal),
          row('Miscellaneous fee (cash only)',misc),row('Agent commission',fee),row(isHdb?'Purchase requirement before CPF / grants':'Purchase requirement before CPF',requirement,'subtotal'),
          ...(isHdb?[row('Housing grants used',-grantUsed)]:[]),row('CPF OA used',-cpfUsed),row('Cash needed before sale proceeds / savings',cashNeeded,'total')]};
    }
    const savings=buy?n(d.cashSavings):0,proceeds=sale?sale.proceeds:0;
    const topUp=buy?Math.max(buy.cashNeeded-proceeds-savings,0):0;
    const buffer=buy?Math.max(proceeds+savings-buy.cashNeeded,0):Math.max(proceeds,0);
    const primary=buy?topUp:proceeds;
    const groups=[];
    if(sale)groups.push({title:'Sale breakdown',rows:sale.rows});
    if(buy)groups.push({title:'Purchase breakdown',rows:buy.rows});
    if(buy)groups.push({title:'Your cash position',rows:[row('Cash needed for purchase',buy.cashNeeded),...(sale?[row('Sale proceeds available',-proceeds)]:[]),row('Cash savings allocated',-savings),row('Additional cash top-up',topUp,'total'),row('Cash remaining after purchase',buffer,'subtotal')]});
    for(const group of groups) {
      for(const r of group.rows) {
        if(group.title==='Sale breakdown') {
          r.bold=r.label==='Selling price';
          r.red=['Outstanding HIP','Resale levy','Bank penalty'].includes(r.label);
        } else if(group.title==='Purchase breakdown') {
          r.bold=['Purchase price','Cash top-up from lower valuation','Loan Shortfall','Buyer stamp duty','Total Stamp Duty','Agent commission','Purchase requirement before CPF','Purchase requirement before CPF / grants','Net loan after paydown','Cash needed before sale proceeds / savings'].includes(r.label)||r.label.startsWith('ABSD (')||r.label.startsWith('Maximum loan at ')||/^(?:\d+(?:\.\d+)?%) (?:loan of|downpayment by|cash downpayment)/.test(r.label);
          r.red=r.label.startsWith('Maximum loan at ')||['Cash top-up from lower valuation','Loan Shortfall','Second HDB loan proceeds paydown'].includes(r.label)||(r.label==='Valuation / market value'&&buy.valuation<buy.price);
        } else r.bold=r.kind==='total';
      }
    }
    return {scenario,config,sale,buy,savings,topUp,buffer,primary,primaryLabel:buy?'Additional cash needed':'Estimated sale proceeds',groups,
      hasFigures:!!((sale&&sale.price)||(buy&&buy.price))};
  }
  const api={scenarios,n,has,stampDuty,additionalDuty,loanRules,commission,calculate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.PropertyModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
