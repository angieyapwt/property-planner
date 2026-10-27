/* Dependency-free, paginated PDF reports. No upload or external service. */
(function(root){
  'use strict';
  const ascii=s=>String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/→|↗/g,' to ').replace(/[–—]/g,'-').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[^\x20-\x7e]/g,' ');
  const escape=s=>ascii(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
  function wrap(text,width=88){
    const words=ascii(text).split(/\s+/),lines=[];let line='';
    for(let word of words){while(word.length>width){if(line){lines.push(line);line='';}lines.push(word.slice(0,width));word=word.slice(width);}if((line+' '+word).trim().length>width){lines.push(line);line=word;}else line=(line+' '+word).trim();}
    if(line)lines.push(line);return lines.length?lines:[''];
  }
  function reportPdf({name,scenario,date,inputs,groups,notes,primaryLabel,primary}){
    const pages=[];let ops=[],y=750;
    function line(text,size=10,bold=false,color='0.12 0.20 0.21'){
      if(y<65){pages.push(ops.join('\n'));ops=[];y=750;}
      ops.push('BT /'+(bold?'F2':'F1')+' '+size+' Tf '+color+' rg 1 0 0 1 45 '+y+' Tm ('+escape(text)+') Tj ET');y-=size+7;
    }
    function heading(text){y-=13;line(text,13,true);y-=4;}
    line('ANGIE YAP  /  PROPERTY STUDIO',10,true);y-=16;
    wrap(name,40).forEach(l=>line(l,22,true));line(scenario,12);line('Prepared '+date,9);y-=10;
    line(primaryLabel,11);y-=18;line(primary,28,true);y-=9;
    line('All amounts in SGD. Planning estimate only.',9);
    for(const group of groups){heading(group.title);for(const r of group.rows){const labels=wrap(r.label,67);labels.forEach((l,i)=>{line(l,10,r.kind==='total');if(i===labels.length-1)ops.push('BT /'+(r.kind==='total'?'F2':'F1')+' 10 Tf 0.12 0.20 0.21 rg 1 0 0 1 440 '+(y+17)+' Tm ('+escape(r.amount)+') Tj ET');});}}
    heading('Figures entered');
    for(const r of inputs)wrap(r.label+': '+r.value).forEach(l=>line(l,9));
    if(notes){heading('Planning notes');for(const paragraph of notes.split(/\r?\n/))wrap(paragraph).forEach(l=>line(l,10));}
    heading('Assumptions');
    for(const p of ['Loan cap: up to 75% of the lower purchase price or valuation. Actual eligibility may be lower. Cash-over-valuation and bank minimum cash downpayment cannot use CPF or grants.','Downpayment, COV and loan top-up rows are explanatory guides already within the purchase requirement. Do not add them again.','Stamp duties use the higher price or market value. Commission includes 9% GST unless an edited total is entered. CPF usage and grants are estimates; confirm eligibility, limits, duties and financing before committing.','This report was generated on your device. CEA Reg No. R067805D.'])wrap(p).forEach(l=>line(l,9));
    pages.push(ops.join('\n'));
    const objects=['<< /Type /Catalog /Pages 2 0 R >>','', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'];
    const kids=[];
    pages.forEach((stream,i)=>{const pageId=objects.length+1,streamId=pageId+1;kids.push(pageId+' 0 R');const footer='BT /F1 8 Tf 0.5 0.55 0.5 rg 1 0 0 1 45 34 Tm (PROPERTY STUDIO  |  '+(i+1)+' / '+pages.length+') Tj ET';stream+='\n'+footer;objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '+streamId+' 0 R >>');objects.push('<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream');});
    objects[1]='<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+pages.length+' >>';
    let pdf='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\n'+o+'\nendobj\n';});
    const xref=pdf.length;pdf+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n';for(const o of offsets.slice(1))pdf+=String(o).padStart(10,'0')+' 00000 n \n';pdf+='trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
    return new TextEncoder().encode(pdf);
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={reportPdf,wrap};else root.PropertyPdf={reportPdf};
})(typeof globalThis!=='undefined'?globalThis:this);
