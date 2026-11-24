/* Transaction checklists share the window draft and workspace backup. */
(function(root) {
  'use strict';
  const node=typeof module!=='undefined'&&module.exports;
  const sheets=node?require('./checklist-data'):root.EstateChecklistData;
  const ids=new Set(sheets.flatMap(sheet=>sheet.groups.flatMap(group=>group.items.map(item=>item.id))));
  const statuses={pending:'Pending',done:'Done',na:'N/A'};

  function defaults() {
    return {version:1,selected:sheets[0].id,name:'',nameAuto:true,entries:{}};
  }

  function clean(raw) {
    const state=defaults();
    if(!raw||typeof raw!=='object')return state;
    if(sheets.some(sheet=>sheet.id===raw.selected))state.selected=raw.selected;
    state.name=String(raw.name??'').slice(0,80);
    state.nameAuto=raw.nameAuto!==false;
    for(const [id,value] of Object.entries(raw.entries||{})) {
      if(!ids.has(id)||!value||typeof value!=='object')continue;
      const status=Object.hasOwn(statuses,value.status)?value.status:'pending';
      const notes=String(value.notes??'').slice(0,1500);
      if(status!=='pending'||notes)state.entries[id]={status,notes};
    }
    return state;
  }

  function update(raw,id,changes) {
    const state=clean(raw);
    if(ids.has(id))state.entries[id]={status:'pending',notes:'',...state.entries[id],...changes};
    return clean(state);
  }

  function progress(items,state) {
    const counts={total:items.length,done:0,na:0,pending:0};
    for(const item of items)counts[state.entries[item.id]?.status||'pending']++;
    counts.reviewed=counts.done+counts.na;
    counts.percent=counts.total?Math.round(counts.reviewed/counts.total*100):0;
    return counts;
  }

  function itemsFor(sheet) {
    return sheet.groups.flatMap(group=>group.items);
  }

  function usedSheets(state) {
    return sheets.filter(sheet=>itemsFor(sheet).some(item=>state.entries[item.id]));
  }

  function reportData(raw,now=new Date(),allUsed=false) {
    const state=clean(raw);
    const selected=allUsed?usedSheets(state):sheets.filter(sheet=>sheet.id===state.selected);
    if(!selected.length)return null;
    const counts=progress(selected.flatMap(itemsFor),state);
    const date=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Singapore',day:'2-digit',month:'short',year:'numeric'}).format(now);
    return {
      kind:'checklist',name:state.name.trim()||'Transaction Checklist',date,
      scenario:'Checklist / '+selected.map(sheet=>sheet.name).join(' + '),
      primaryLabel:'Items reviewed',primary:counts.reviewed+' of '+counts.total,
      inputs:[{label:'Checklist',value:selected.map(sheet=>sheet.name).join(', ')},
        {label:'Progress',value:counts.done+' done, '+counts.na+' N/A, '+counts.pending+' pending'}],
      groups:selected.flatMap(sheet=>sheet.groups.map(group=>({
        title:sheet.name+' / '+group.title,
        rows:group.items.flatMap(item=>{
          const entry=state.entries[item.id]||{status:'pending',notes:''};
          return [{label:item.text,amount:statuses[entry.status]},
            ...(item.verification?[{label:'Verification note: '+item.verification.text,amount:''}]:[]),
            ...entry.notes.split(/\r?\n/).filter(Boolean).map(note=>({label:'Note: '+note,amount:''}))];
        })
      }))),
      assumptions:[
        'Source: Checklist (1).xlsx. The four worksheets retain their original checklist wording.',
        'Reviewed includes items marked Done or N/A. Pending items remain open.',
        'Selected HDB items include verification notes with HDB guidance checked on 24 Nov 2026.'
      ]
    };
  }

  const api={sheets,defaults,clean,update,progress,itemsFor,usedSheets,reportData};
  if(node){module.exports=api;return;}

  const $=id=>document.getElementById(id);
  const key='estate-basics-checklist-v1';
  const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let state=defaults();
  const openNotes=new Set();
  try{state=clean(JSON.parse(root.EstateDraft.getItem(key)||'null'));}catch{}

  function sharedName() {
    return root.EstatePlannerBridge?.getReportName()||root.EstateAffordability?.getReportName()||'';
  }

  function currentState() {
    return clean({...state,name:state.nameAuto?sharedName():state.name});
  }

  function persist() {
    try {
      root.EstateDraft.setItem(key,JSON.stringify(currentState()));
      $('checklistSaveStatus').textContent='Progress stays in this window. Save all to device keeps a copy of every checklist.';
    } catch {
      $('checklistSaveStatus').textContent='Window storage is unavailable. Save all to device to keep your checklist.';
    }
  }

  function render() {
    const sheet=sheets.find(sheet=>sheet.id===state.selected);
    const counts=progress(itemsFor(sheet),state);
    $('checklistName').value=currentState().name;
    $('checklistTypes').innerHTML=sheets.map(value=>{
      const total=progress(itemsFor(value),state);
      return `<button type="button" class="checklist-type" data-checklist-type="${value.id}" aria-pressed="${value.id===state.selected}"><span>${escape(value.name)}</span><small>${total.reviewed} / ${total.total} reviewed</small></button>`;
    }).join('');
    $('checklistTitle').textContent=sheet.title;
    $('checklistProgressText').textContent=counts.reviewed+' of '+counts.total+' reviewed';
    $('checklistProgress').value=counts.reviewed;
    $('checklistProgress').max=counts.total;
    $('checklistCounts').textContent=counts.done+' done · '+counts.na+' N/A · '+counts.pending+' pending';
    $('checklistGroups').innerHTML=sheet.groups.map(group=>{
      const total=progress(group.items,state);
      return `<section class="checklist-group" aria-labelledby="${group.id}-title"><div class="checklist-group-heading"><h3 id="${group.id}-title">${escape(group.title)}</h3><span>${total.reviewed} / ${total.total}</span></div>${group.items.map(item=>{
        const entry=state.entries[item.id]||{status:'pending',notes:''};
        return `<div class="checklist-item ${entry.status}" data-checklist-item="${item.id}">
          <div class="checklist-item-main"><label class="checklist-item-label" for="${item.id}-done"><input id="${item.id}-done" data-checklist-status="done" data-item="${item.id}" type="checkbox" ${entry.status==='done'?'checked':''}><span>${escape(item.text)}</span></label>
          <label class="checklist-na" title="Not applicable"><input id="${item.id}-na" data-checklist-status="na" data-item="${item.id}" type="checkbox" aria-label="Not applicable: ${escape(item.text)}" ${entry.status==='na'?'checked':''}> N/A</label></div>
          ${item.verification?`<p class="checklist-verification"><strong>Verify for this case.</strong> ${escape(item.verification.text)} <a href="${escape(item.verification.url)}" target="_blank" rel="noopener">HDB guidance</a></p>`:''}
          <details class="checklist-notes" data-item="${item.id}" ${entry.notes||openNotes.has(item.id)?'open':''}><summary>Notes${entry.notes?' added':''}</summary><textarea data-checklist-notes="${item.id}" aria-label="Notes for ${escape(item.text)}" maxlength="1500" rows="2">${escape(entry.notes)}</textarea></details>
        </div>`;
      }).join('')}</section>`;
    }).join('');
  }

  $('checklistTypes').addEventListener('click',event=>{
    const button=event.target.closest('[data-checklist-type]');
    if(!button)return;
    state.selected=button.dataset.checklistType;
    render();
    $('checklistTypes').querySelector(`[data-checklist-type="${state.selected}"]`).focus({preventScroll:true});
    persist();
  });
  $('checklistGroups').addEventListener('change',event=>{
    const input=event.target;
    if(!input.dataset.checklistStatus)return;
    state=update(state,input.dataset.item,{status:input.checked?input.dataset.checklistStatus:'pending'});
    render();
    $(input.id).focus({preventScroll:true});
    persist();
  });
  $('checklistGroups').addEventListener('input',event=>{
    const input=event.target;
    if(!input.dataset.checklistNotes)return;
    state=update(state,input.dataset.checklistNotes,{notes:input.value});
    input.closest('details').querySelector('summary').textContent=input.value?'Notes added':'Notes';
    persist();
  });
  $('checklistGroups').addEventListener('toggle',event=>{
    const details=event.target;
    if(!details.matches('.checklist-notes'))return;
    if(details.open)openNotes.add(details.dataset.item);
    else openNotes.delete(details.dataset.item);
  },true);
  $('checklistName').addEventListener('input',event=>{
    state.name=event.target.value;
    state.nameAuto=!state.name.trim();
    persist();
  });
  document.addEventListener('estate:tab-changed',event=>{
    if(event.detail==='checklist'){render();persist();}
  });
  $('exportChecklistPdf').addEventListener('click',()=>{
    const now=new Date();
    const data=reportData(currentState(),now);
    const bytes=root.PropertyPdf.reportPdf(data);
    const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
    const link=document.createElement('a');
    link.href=url;
    link.download=root.PropertyPdf.filename(data.name,now).replace('Property Planner - ','Checklist - ')+' - '+sheets.find(sheet=>sheet.id===state.selected).name+'.pdf';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
  });
  root.EstateChecklist={
    getState:currentState,
    setState(raw){state=clean(raw);openNotes.clear();render();persist();},
    startFresh(){state=defaults();openNotes.clear();render();persist();},
    getReportData(now){return reportData(currentState(),now,true);}
  };
  render();
})(globalThis);
