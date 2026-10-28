/* Compose the current local workspaces without changing either calculation. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),buttons=[$('exportCombinedPlanner'),$('exportCombinedAssessment')];
  let missingTab='planner';
  function notice(message,tab){missingTab=tab;$('combinedNoticeMessage').textContent=message;$('combinedReportNotice').showModal();}
  function exportCombined(){
    const planner=window.EstatePlannerBridge?.getReportData(),assessment=window.EstateAffordability?.getReportData();
    if(!planner){notice('Enter a purchase or selling price in Property Planner, then export the combined report again.','planner');return;}
    if(!assessment){notice('Enter a valid age or DOB and income for the selected applicant(s) in Affordability Assessment, then export the combined report again.','affordability');return;}
    buttons.forEach(button=>button.disabled=true);
    try{
      const now=new Date(),name=window.EstatePlannerBridge.getReportName().trim()||window.EstateAffordability.getReportName().trim()||planner.name;
      const date=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Singapore',day:'2-digit',month:'short',year:'numeric'}).format(now);
      const bytes=PropertyPdf.combinedReport({name,date,planner,assessment});
      const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})),link=document.createElement('a');
      link.href=url;link.download=PropertyPdf.filename(name,now)+'.pdf';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    }catch{notice('The combined report could not be generated. Your figures are still available. Try exporting again.','planner');}
    finally{buttons.forEach(button=>button.disabled=false);}
  }
  buttons.forEach(button=>button.addEventListener('click',exportCombined));
  $('combinedNoticeClose').addEventListener('click',()=>$('combinedReportNotice').close());
  $('combinedNoticeGo').addEventListener('click',()=>{$('combinedReportNotice').close();document.dispatchEvent(new CustomEvent('estate:show-tab',{detail:missingTab}));});
})();
