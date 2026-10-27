const assert=require('node:assert/strict'),fs=require('node:fs');
const m=require('./model.js'),pdf=require('./pdf.js');
let count=0;function eq(a,b){assert.ok(Math.abs(a-b)<.01,a+' != '+b);count++;}
eq(m.stampDuty(600000),12600);eq(m.stampDuty(1000000),24600);
eq(m.commission(1000000,1,true,''),10900);eq(m.commission(1000000,1,true,12345),12345);eq(m.commission(1000000,1,true,0),0);eq(m.commission(1000000,1,false,12345),0);
const d={buyPrice:600000,buyValuation:550000,buyLoan:500000,buyCpf:1000000,buyCommissionOn:false,saleCommissionOn:false,loanType:'HDB loan'};
for(const s of ['buy-hdb','hdb-to-hdb']){
 let r=m.calculate(s,d);eq(r.buy.loan,412500);eq(r.buy.cov,50000);eq(r.buy.loanGap,37500);eq(r.topUp,50000);
 r=m.calculate(s,{...d,buyGrant:1000000});eq(r.topUp,50000);
 r=m.calculate(s,{...d,loanType:'Bank loan'});eq(r.topUp,77500);let rows=r.buy.rows;eq(rows.findIndex(x=>x.label.startsWith('Cash-over-valuation')),rows.findIndex(x=>x.label==='5% cash downpayment')+1);
 r=m.calculate(s,{...d,loanType:'No loan'});eq(r.buy.loan,0);eq(r.topUp,50000);eq(r.buy.loanGap,0);
 for(const value of [600000,650000,'']){r=m.calculate(s,{...d,buyValuation:value});eq(r.buy.loan,450000);eq(r.topUp,0);}
 r=m.calculate(s,{...d,buyValuation:0});eq(r.buy.loan,0);eq(r.topUp,600000);
 r=m.calculate(s,{...d,buyCpf:0});eq(r.topUp,200100);
}
let r=m.calculate('hdb-to-hdb',{...d,salePrice:500000,saleLoan:100000,saleCpf:200000});eq(r.sale.proceeds,200000);eq(r.buy.paydown,100000);eq(r.buy.loanUsed,312500);eq(r.topUp,0);eq(r.buffer,150000);
r=m.calculate('hdb-to-hdb',{...d,salePrice:500000,saleLoan:100000,saleCpf:200000,buyPaydown:0});eq(r.buy.paydown,0);
for(const s of Object.keys(m.scenarios)){r=m.calculate(s,{...d,salePrice:900000,saleLoan:300000,saleCpf:200000,cashSavings:10000});assert.ok(Number.isFinite(r.primary));count++;for(const g of r.groups)for(const row of g.rows){assert.ok(Number.isFinite(row.value));count++;}}
r=m.calculate('sell-condo',{salePrice:1000000,saleLoan:400000,saleCpf:100000,saleLegal:3000,saleMisc:1000,saleRate:2,saleOverride:12345});eq(r.primary,483655);
r=m.calculate('buy-condo',{...d,loanType:'Bank loan',buyOverride:12345,buyCommissionOn:true});eq(r.buy.fee,12345);eq(r.topUp,89845);
r=m.calculate('hdb-to-condo',{...d,salePrice:100000,saleLoan:200000});eq(r.sale.proceeds,-100000);eq(r.topUp,177500);
for(let i=0;i<250;i++){const price=100000+i*10000,val=price*(i%2?.8:1.1);r=m.calculate('buy-hdb',{buyPrice:price,buyValuation:val,buyLoan:price,loanType:i%3?'Bank loan':'HDB loan',buyCpf:i*7000,buyGrant:i%2?10000:0,buyLegal:2500,buyMisc:1000,buyRate:1});assert.ok(r.buy.loan<=Math.min(price,val)*.75);assert.ok(r.buy.cashNeeded>=r.buy.cov);eq(r.buy.requirement,r.buy.cashNeeded+r.buy.cpfUsed+r.buy.grantUsed);count+=2;}
const money=v=>new Intl.NumberFormat('en-SG',{style:'currency',currency:'SGD',maximumFractionDigits:0}).format(v);
r=m.calculate('hdb-to-hdb',{...d,salePrice:750000,saleLoan:100000,saleCpf:200000});
const report=pdf.reportPdf({name:'Our next home (sample)',scenario:r.config.label,date:'27 Oct 2026',primaryLabel:r.primaryLabel,primary:money(r.primary),inputs:[{label:'Property',value:'Example only'}],groups:r.groups.map(g=>({...g,rows:g.rows.map(row=>({...row,amount:money(row.value)}))})),notes:'Example report. '+('Long note to validate pagination and wrapping. '.repeat(45))});
fs.writeFileSync(__dirname+'/sample-report.pdf',report);assert.ok(Buffer.from(report).toString().startsWith('%PDF-1.4'));count++;
console.log(count+' assertions passed across all seven scenarios. PDF sample generated.');
