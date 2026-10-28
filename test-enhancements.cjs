const assert=require('node:assert/strict');
const {calculate,commission}=require('./model.js');
let checks=0;
const eq=(a,b)=>{assert.equal(a,b);checks++;};
const price=800000;
let result=calculate('buy-hdb',{buyPrice:price,buyValuation:800000,loanType:'HDB loan',buyLoanAuto:true,buyLoan:1,buyCommissionOn:false});
eq(result.buy.loan,600000);
result=calculate('buy-hdb',{buyPrice:price,buyValuation:550000,loanType:'HDB loan',buyLoanAuto:true,buyLoan:1,buyCommissionOn:false});
eq(result.buy.loan,412500);eq(result.buy.cov,250000);
let manual=calculate('buy-hdb',{buyPrice:price,buyValuation:800000,loanType:'HDB loan',buyLoanAuto:false,buyLoan:300000,buyCommissionOn:false});
eq(manual.buy.loan,300000);
let automatic=calculate('buy-hdb',{buyPrice:price,buyValuation:800000,loanType:'HDB loan',buyLoanAuto:true,buyCommissionOn:false});
eq(manual.buy.cashNeeded-automatic.buy.cashNeeded,300000);
eq(calculate('buy-hdb',{buyPrice:price,loanType:'No loan',buyLoanAuto:true}).buy.loan,0);
eq(calculate('buy-hdb',{buyPrice:price,loanType:'HDB loan',buyLoanAuto:false,buyLoan:0}).buy.loan,0);
for(const rate of [1,2]){
 eq(commission(1000000,rate,true,'',false),1000000*rate/100);
 eq(commission(1000000,rate,true,'',true),1000000*rate/100*1.09);
 eq(commission(1000000,rate,true,0,false),0);
 eq(commission(1000000,rate,true,15000,false),15000);
 eq(commission(1000000,rate,false,15000,true),0);
}
const input={buyPrice:price,buyValuation:550000,loanType:'Bank loan',buyLoanAuto:true,salePrice:900000,saleCommissionOn:true,saleCommissionGst:false,saleRate:2,buyCommissionOn:true,buyCommissionGst:false,buyRate:1};
result=calculate('hdb-to-hdb',input);
eq(result.buy.fee,8000);eq(result.sale.rows.find(r=>r.label==='Agent commission (without GST)').value,-18000);
const bolds=result.buy.rows.filter(r=>r.bold).map(r=>r.label);
assert.deepEqual(bolds,['Purchase price','20% downpayment by cash / CPF','5% cash downpayment','Maximum loan at 75% of lower price / valuation','Buyer stamp duty','ABSD (0%)','Purchase requirement before CPF / grants']);checks++;
assert.deepEqual(result.sale.rows.filter(r=>r.bold).map(r=>r.label),['Selling price']);checks++;
assert.deepEqual(result.sale.rows.filter(r=>r.red).map(r=>r.label),['Outstanding HIP','Resale levy','Bank penalty']);checks++;
assert.deepEqual(result.buy.rows.filter(r=>r.red).map(r=>r.label),['Valuation / market value','Cash top up for Loan']);checks++;
result=calculate('hdb-to-hdb',{...input,loanType:'HDB loan'});
eq(result.buy.rows.find(r=>r.label==='Second HDB loan proceeds paydown').red,true);
eq(result.buy.rows.find(r=>r.label==='Net loan after paydown').bold,true);
result=calculate('buy-hdb',{...input,buyValuation:850000});
eq(!!result.buy.rows.find(r=>r.label==='Valuation / market value').red,false);
for(const scenario of ['buy-condo','condo-to-condo','hdb-to-condo']){result=calculate(scenario,input);eq(result.buy.fee,8000);eq(result.buy.loan,412500);}
console.log(checks+' enhancement assertions passed.');
