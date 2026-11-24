const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const checklist=require('./checklist');
const pdf=require('./pdf');
let checks=0;
function equal(actual,expected){assert.deepEqual(actual,expected);checks++;}
function ok(value){assert.ok(value);checks++;}

equal(checklist.sheets.map(sheet=>sheet.name),['HDB Seller','HDB Buyer','Private Seller','Private Buyer']);
equal(checklist.sheets.map(sheet=>checklist.itemsFor(sheet).length),[29,27,26,25]);
const allItems=checklist.sheets.flatMap(checklist.itemsFor);
equal(new Set(allItems.map(item=>item.id)).size,107);
ok(allItems.some(item=>item.id==='private-buyer-a16'&&item.text==='Outstanding loan amount'));
let state=checklist.defaults();
equal(checklist.reportData(state,new Date(),true),null);
const first=allItems[0].id,second=allItems[1].id;
state=checklist.update(state,first,{status:'done'});
state.generalNotes['hdb-seller']='MOP confirmed on HDB portal.';
state=checklist.update(state,second,{status:'na'});
let counts=checklist.progress(checklist.itemsFor(checklist.sheets[0]),state);
equal([counts.reviewed,counts.done,counts.na,counts.pending],[2,1,1,27]);
state=checklist.update(state,first,{status:'na'});
counts=checklist.progress(checklist.itemsFor(checklist.sheets[0]),state);
equal([counts.reviewed,counts.done,counts.na],[2,0,2]);
equal(state.generalNotes['hdb-seller'],'MOP confirmed on HDB portal.');
state.selected='private-buyer';
state=checklist.update(state,'private-buyer-a4',{status:'done'});
state.generalNotes['private-buyer']='Age checked.';
equal(checklist.usedSheets(state).map(sheet=>sheet.id),['hdb-seller','private-buyer']);
equal(checklist.progress(checklist.itemsFor(checklist.sheets[2]),state).reviewed,0);
equal(checklist.clean(JSON.parse(JSON.stringify(state))),state);
const invalid=checklist.clean({...state,selected:'missing',entries:{unknown:{status:'done'},[first]:{status:'bad',notes:'x'.repeat(2000)}}});
equal(invalid.selected,'hdb-seller');
ok(!invalid.entries[first]);
ok(invalid.generalNotes['hdb-seller'].includes('x'.repeat(1500)));
ok(!Object.hasOwn(invalid.entries,'unknown'));
const now=new Date('2026-11-24T04:00:00Z');
const notesOnly=checklist.reportData({generalNotes:{'hdb-buyer':'General buyer note'}},now,true);
equal(notesOnly.notes,'General buyer note');
equal(notesOnly.primary,'0 of 27');
const report=checklist.reportData({...state,name:'Example Client'},now);
equal(report.date,'24 Nov 2026');
equal(report.scenario,'Checklist / Private Buyer');
equal(report.primary,'1 of 25');
equal(report.notes,'Age checked.');
ok(report.groups.every(group=>group.rows.every(row=>!row.label.startsWith('Note:')&&!row.label.startsWith('Verification note:'))));
const migrated=checklist.clean({version:1,entries:{[first]:{status:'done',notes:'Older item note'}}});
equal(migrated.entries[first],{status:'done'});
ok(migrated.generalNotes['hdb-seller'].includes('Older item note'));
equal(checklist.clean(JSON.parse(JSON.stringify(migrated))),migrated);
equal(checklist.defaults().generalNotes,{});
const combined=checklist.reportData(state,now,true);
equal(combined.primary,'3 of 54');
ok(combined.groups.some(group=>group.title.startsWith('HDB Seller /')));
ok(combined.groups.some(group=>group.title.startsWith('Private Buyer /')));
const bytes=pdf.reportPdf(report);
const text=Buffer.from(bytes).toString('ascii');
for(const value of ['CHECKLIST / PROGRESS','Private Buyer','Age checked.','General notes'])ok(text.includes(value));
ok(!text.includes('Verification note:'));
ok(!text.includes('Checklist notes'));
ok(!text.includes('SGD  /  ESTIMATE ONLY'));
const workspace=Buffer.from(pdf.workspaceReport({checklist:combined},now)).toString('ascii');
ok(workspace.includes('HDB Seller /'));
ok(workspace.includes('Private Buyer /'));
equal(checklist.defaults().entries,{});
fs.writeFileSync('../checklist-qa.pdf',bytes);

// Exercise the actual workspace restore handler with current and older saves.
const elements={};
function element(id){return elements[id]??={handlers:{},value:'',textContent:'',files:[],classList:{add(){},remove(){}},addEventListener(type,fn){this.handlers[type]=fn;},focus(){}};}
const initial=()=>({planner:{current:{scenario:'buy-hdb'},drafts:{}},assessment:{},budget:{},others:{},client:{edited:[]},checklist:checklist.defaults()});
let saved=initial();
const tabs=Object.fromEntries(Object.keys(saved).map(name=>[name,{
  getState:()=>saved[name],setState(value){saved[name]=value;},startFresh(){saved[name]=name==='checklist'?checklist.defaults():{};}
}]));
const document={getElementById:element,querySelectorAll:()=>[],dispatchEvent(){}};
const window={EstatePlannerBridge:tabs.planner,EstateAffordability:tabs.assessment,
  EstatePurchaseBudget:tabs.budget,EstateOthers:tabs.others,EstateClientReport:tabs.client,EstateChecklist:tabs.checklist};
vm.runInNewContext(fs.readFileSync('./workspace-fresh.js','utf8'),{
  window,document,PropertyPdf:pdf,CustomEvent:class{},setTimeout(){},clearTimeout(){},Blob,URL
});
async function restore(payload){
  const input=element('workspaceRestoreFile');
  input.files=[{size:JSON.stringify(payload).length,text:async()=>JSON.stringify(payload)}];
  await input.handlers.change();
}
(async()=>{
  await restore({type:'estate-basics-workspace',version:1,tabs:{...initial(),checklist:state}});
  equal(JSON.parse(JSON.stringify(saved.checklist)),state);
  equal(element('toast').textContent,'Workspace restored.');
  const legacy=initial();delete legacy.checklist;
  await restore({type:'estate-basics-workspace',version:1,tabs:legacy});
  equal(saved.checklist.entries,{});
  equal(element('toast').textContent,'Workspace restored.');
  const previous=JSON.stringify(saved);
  await restore({type:'estate-basics-workspace',version:1,tabs:{...initial(),checklist:[]}});
  equal(JSON.stringify(saved),previous);
  equal(element('toast').textContent,'Choose a valid Estate Basics workspace file.');
  console.log(checks+' checklist content, progress, PDF and workspace restore checks passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
