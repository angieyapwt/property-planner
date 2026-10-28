/* Reset only the explicitly selected local workspace. */
(() => {
  const $=id=>document.getElementById(id);let target='affordability';
  for(const [id,type]of [['affStartFresh','affordability'],['othersStartFresh','others']])$(id).addEventListener('click',()=>{target=type;$('workspaceFreshTitle').textContent=type==='affordability'?'Start a fresh affordability assessment?':'Start a fresh Others calculation?';$('workspaceFreshDialog').showModal();});
  $('cancelWorkspaceFresh').addEventListener('click',()=>$('workspaceFreshDialog').close());
  $('confirmWorkspaceFresh').addEventListener('click',()=>{(target==='affordability'?window.EstateAffordability:window.EstateOthers).startFresh();$('workspaceFreshDialog').close();});
})();
