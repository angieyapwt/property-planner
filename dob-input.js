/* DOB presentation only; saved dates retain ISO format for calculations/backups. */
(function(root){
  'use strict';
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function parse(value){
    const s=String(value||'').trim();let year,month,day,m;
    if((m=/^(\d{2})(\d{2})(\d{4})$/.exec(s))){day=+m[1];month=+m[2];year=+m[3];}
    else if((m=/^(\d{2})-([a-z]{3})-(\d{4})$/i.exec(s))){day=+m[1];month=months.findIndex(v=>v.toLowerCase()===m[2].toLowerCase())+1;year=+m[3];}
    else if((m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s))){year=+m[1];month=+m[2];day=+m[3];}
    else return '';
    const d=new Date(Date.UTC(year,month-1,day));
    if(year<1000||year>9999||d.getUTCFullYear()!==year||d.getUTCMonth()+1!==month||d.getUTCDate()!==day)return '';
    return String(year)+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
  }
  function format(value){const iso=parse(value);if(!iso)return '';const [y,m,d]=iso.split('-');return d+'-'+months[+m-1]+'-'+y;}
  const api={parse,format};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.DobInput=api;
  if(typeof document!=='undefined'){
    const isDob=el=>el?.matches?.('[data-dob-input]');
    function update(el){const iso=parse(el.value);if(iso)el.value=format(iso);el.setCustomValidity(el.value&&!iso?'Enter a valid date as DDMMYYYY, for example 05021990.':'');el.setAttribute('aria-invalid',String(Boolean(el.value&&!iso)));}
    document.addEventListener('input',e=>{if(isDob(e.target))update(e.target);},true);
    document.addEventListener('focusout',e=>{if(isDob(e.target)){update(e.target);if(e.target.value&&!parse(e.target.value))e.target.reportValidity();}},true);
    document.addEventListener('focusin',e=>{if(isDob(e.target)&&parse(e.target.value))e.target.select();});
  }
})(typeof globalThis!=='undefined'?globalThis:this);
