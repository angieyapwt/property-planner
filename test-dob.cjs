const assert=require('node:assert/strict');
const d=require('./dob-input');
for(const [v,w] of [['05021990','1990-02-05'],['29022000','2000-02-29'],['29021990',''],['31042000',''],['05-feb-1990','1990-02-05'],['',''],['123','']])assert.equal(d.parse(v),w);
assert.equal(d.format('1990-02-05'),'05-Feb-1990');
console.log('8 DOB format and validation checks passed');
