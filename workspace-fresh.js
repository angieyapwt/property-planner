/* Workspace actions shared by every tab. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const tabs = {
    planner:window.EstatePlannerBridge, assessment:window.EstateAffordability,
    budget:window.EstatePurchaseBudget, others:window.EstateOthers, client:window.EstateClientReport,
    checklist:window.EstateChecklist
  };
  const dialog = $('workspaceFreshDialog');
  const fileInput = $('workspaceRestoreFile');
  let toastTimer;
  function status(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'),4300);
  }
  function snapshot() {
    return Object.fromEntries(Object.entries(tabs).map(([name,tab]) => [name,tab.getState()]));
  }
  function reset() {
    for (const tab of Object.values(tabs)) tab.startFresh();
  }
  document.querySelectorAll('[data-workspace-fresh]').forEach(button =>
    button.addEventListener('click',() => dialog.showModal()));
  $('cancelWorkspaceFresh').addEventListener('click',() => dialog.close());
  $('confirmWorkspaceFresh').addEventListener('click',() => {
    reset();
    dialog.close();
    document.dispatchEvent(new CustomEvent('estate:show-tab',{detail:'planner'}));
    $('plannerTab').focus();
    status('All tabs reset.');
  });
  function download(data,type,filename) {
    const url = URL.createObjectURL(new Blob([data],{type}));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url),30000);
  }
  function filename(now) {
    const name = tabs.planner.getReportName().trim() || tabs.assessment.getReportName().trim() || 'All tabs';
    return PropertyPdf.filename(name,now).replace('Property Planner - ','Estate Basics - ');
  }
  function save() {
    const now = new Date();
    const payload = {type:'estate-basics-workspace',version:1,tabs:snapshot()};
    download(JSON.stringify(payload,null,2),'application/json',filename(now)+'.json');
    status('Workspace file downloaded.');
  }
  function pdf() {
    const now = new Date();
    let bytes;
    try {
      const reports = Object.fromEntries(Object.entries(tabs).map(([name,tab]) => [name,tab.getReportData(now)]));
      bytes = PropertyPdf.workspaceReport(reports,now);
    } catch {
      status('Could not export the combined PDF.');
      return;
    }
    if (!bytes) {
      status('Complete at least one calculation to export a combined PDF.');
      return;
    }
    download(bytes,'application/pdf',filename(now)+' - Combined.pdf');
    status('Combined PDF downloaded.');
  }
  const actions = {save,restore:() => fileInput.click(),pdf};
  document.querySelectorAll('[data-workspace-action]').forEach(button =>
    button.addEventListener('click',() => actions[button.dataset.workspaceAction]()));
  function readWorkspace(file) {
    if (file?.type === 'estate-basics-workspace' && file.version === 1 &&
        ['planner','assessment','budget','others','client'].every(name => file.tabs?.[name] && typeof file.tabs[name] === 'object' && !Array.isArray(file.tabs[name]))) {
      if (!file.tabs.planner.current || !Array.isArray(file.tabs.client.edited)) throw Error('Invalid workspace');
      if(Object.hasOwn(file.tabs,'checklist')&&(!file.tabs.checklist||typeof file.tabs.checklist!=='object'||Array.isArray(file.tabs.checklist)))throw Error('Invalid checklist');
      return file.tabs;
    }
    if (file?.version === 1 && Array.isArray(file.cases) && file.current) {
      return {planner:{current:file.current,drafts:file.drafts},assessment:file.affordability,others:file.others};
    }
    throw Error('Invalid workspace');
  }
  fileInput.addEventListener('change',async () => {
    const file = fileInput.files[0];
    if (!file) return;
    fileInput.value = '';
    try {
      if (file.size > 2000000) throw Error('File too large');
      const restored = readWorkspace(JSON.parse(await file.text()));
      const previous = snapshot();
      try {
        for (const [name,tab] of Object.entries(tabs)) {
          if (restored[name]) tab.setState(restored[name]);
          else tab.startFresh();
        }
      } catch (error) {
        for (const [name,tab] of Object.entries(tabs)) tab.setState(previous[name]);
        throw error;
      }
      status('Workspace restored.');
    } catch {
      status('Choose a valid Estate Basics workspace file.');
    }
  });
})();
