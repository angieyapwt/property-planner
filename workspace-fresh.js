/* Reset only the explicitly selected local workspace. */
(() => {
  const $=id=>document.getElementById(id);
  let reset;
  const actions=[
    ['affStartFresh','Start a fresh affordability assessment?',()=>window.EstateAffordability.startFresh()],
    ['othersStartFresh','Start a fresh Others calculation?',()=>window.EstateOthers.startFresh()],
    ['clientStartFresh','Start a fresh Client Report?',()=>window.EstateClientReport.startFresh()]
  ];
  for(const [id,title,startFresh] of actions)$(id).addEventListener('click',()=>{
    reset=startFresh;
    $('workspaceFreshTitle').textContent=title;
    $('workspaceFreshDialog').showModal();
  });
  $('cancelWorkspaceFresh').addEventListener('click',()=>$('workspaceFreshDialog').close());
  $('confirmWorkspaceFresh').addEventListener('click',()=>{reset();$('workspaceFreshDialog').close();});
})();
