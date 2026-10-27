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
    return Math.floor(total);
  }
  function commission(price, rate, on, override) {
    return on === false ? 0 : has(override) ? n(override) : n(price)*n(rate)/100*1.09;
  }
  const row=(label,value,kind='')=>({label,value,kind});
  function calculate(scenario, d={}) {
    const config=scenarios[scenario] || scenarios['buy-hdb'];
    let sale=null,buy=null;
    if(config.sell) {
      const price=n(d.salePrice), loan=n(d.saleLoan), cpf=n(d.saleCpf),
        hip=config.sell==='hdb'?n(d.saleHip):0, levy=config.sell==='hdb'?n(d.saleLevy):0,
        ssd=config.sell==='condo'?n(d.saleSsd):0, penalty=n(d.salePenalty),
        legal=n(d.saleLegal), misc=n(d.saleMisc), fee=commission(price,d.saleRate,d.saleCommissionOn,d.saleOverride);
      const proceeds=price-loan-cpf-hip-levy-ssd-penalty-legal-misc-fee;
      sale={price,proceeds,rows:[row('Selling price',price),row('Outstanding loan',-loan),row('CPF refund with accrued interest',-cpf),
        ...(config.sell==='hdb'?[row('Outstanding HIP',-hip),row('Resale levy',-levy)]:[row('Seller stamp duty',-ssd)]),
        row('Bank penalty',-penalty),row('Legal fee',-legal),row('Miscellaneous fee',-misc),row('Commission including GST',-fee),row('Estimated sale proceeds',proceeds,'total')]};
    }
    if(config.buy) {
      const isHdb=config.buy==='hdb', price=n(d.buyPrice), valuation=has(d.buyValuation)?n(d.buyValuation):price;
      const basis=Math.min(price,valuation), stampBasis=Math.max(price,valuation);
      const loanType=d.loanType==='No loan'?'No loan':isHdb&&d.loanType==='HDB loan'?'HDB loan':'Bank loan';
      const maxLoan=loanType==='No loan'?0:basis*.75, loan=Math.min(n(d.buyLoan),maxLoan);
      const paydownApplicable=isHdb && !!sale && loanType==='HDB loan';
      const paydown=paydownApplicable?Math.min(has(d.buyPaydown)?n(d.buyPaydown):Math.max(sale.proceeds,0)*.5,loan):0;
      const loanUsed=loan-paydown, cov=Math.max(price-valuation,0), cashDown=loanType==='Bank loan'?basis*.05:0;
      const bsd=stampDuty(stampBasis),absd=stampBasis*n(d.absdRate)/100,legal=n(d.buyLegal),misc=n(d.buyMisc);
      const fee=commission(price,d.buyRate,d.buyCommissionOn,d.buyOverride);
      const requirement=price-loanUsed+bsd+absd+legal+misc+fee;
      const cashOnly=cov+cashDown+misc+fee;
      const cpfEligible=Math.max(requirement-cashOnly,0);
      const grantUsed=isHdb?Math.min(n(d.buyGrant),cpfEligible):0;
      const cpfUsed=Math.min(n(d.buyCpf),Math.max(cpfEligible-grantUsed,0));
      const cashNeeded=cashOnly+Math.max(cpfEligible-grantUsed-cpfUsed,0);
      const loanGap=loanType==='No loan'?0:Math.max(price*.75-valuation*.75,0);
      const downRows=loanType==='No loan'?[row('Purchase without a loan',price,'guide')]:loanType==='HDB loan'?
        [row('25% downpayment by cash / CPF',basis*.25,'guide')]:[row('20% downpayment by cash / CPF',basis*.20,'guide'),row('5% cash downpayment',cashDown,'guide')];
      buy={price,valuation,basis,loan,maxLoan,loanUsed,paydown,cov,loanGap,bsd,absd,fee,requirement,grantUsed,cpfUsed,cashOnly,cashNeeded,
        rows:[row('Purchase price',price),row('Valuation / market value',valuation),...downRows,row('Cash-over-valuation (cash only)',cov,'guide'),
          row('Maximum loan at 75% of lower price / valuation',maxLoan,'guide'),row('Loan used before paydown',-loan),
          ...(paydownApplicable?[row('Second HDB loan proceeds paydown',paydown),row('Net loan after paydown',-loanUsed,'guide')]:[]),
          row('Cash top up for Loan',loanGap,'guide'),...(maxLoan>loan?[row('Additional approved-loan shortfall',maxLoan-loan,'guide')]:[]),
          row('Stamp duty basis',stampBasis,'guide'),row('Buyer stamp duty',bsd),row('ABSD ('+n(d.absdRate)+'%)',absd),row('Legal fee',legal),
          row('Miscellaneous fee (cash only)',misc),row('Commission including GST (cash only)',fee),row('Purchase requirement before CPF / grants',requirement,'subtotal'),
          row('Housing grants used',-grantUsed),row('CPF OA used',-cpfUsed),row('Cash needed before sale proceeds / savings',cashNeeded,'total')]};
    }
    const savings=buy?n(d.cashSavings):0,proceeds=sale?sale.proceeds:0;
    const topUp=buy?Math.max(buy.cashNeeded-proceeds-savings,0):0;
    const buffer=buy?Math.max(proceeds+savings-buy.cashNeeded,0):Math.max(proceeds,0);
    const primary=buy?topUp:proceeds;
    const groups=[];
    if(sale)groups.push({title:'Sale breakdown',rows:sale.rows});
    if(buy)groups.push({title:'Purchase breakdown',rows:buy.rows});
    if(buy)groups.push({title:'Your cash position',rows:[row('Cash needed for purchase',buy.cashNeeded),...(sale?[row('Sale proceeds available',-proceeds)]:[]),row('Cash savings allocated',-savings),row('Additional cash top-up',topUp,'total'),row('Cash remaining after purchase',buffer,'subtotal')]});
    return {scenario,config,sale,buy,savings,topUp,buffer,primary,primaryLabel:buy?'Additional cash needed':'Estimated sale proceeds',groups,
      hasFigures:!!((sale&&sale.price)||(buy&&buy.price))};
  }
  const api={scenarios,n,has,stampDuty,commission,calculate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.PropertyModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
