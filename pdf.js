/* Estate Basics: private, paginated A4 planning reports. */
(function(root){
  'use strict';
  const ascii=s=>String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/→|↗/g,' to ').replace(/[–—]/g,'-').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[^\x20-\x7e]/g,' ');
  const escape=s=>ascii(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
  function wrap(text,width=85){
    const words=ascii(text).split(/\s+/),lines=[];let line='';
    for(let word of words){while(word.length>width){if(line){lines.push(line);line='';}lines.push(word.slice(0,width));word=word.slice(width);}if((line+' '+word).trim().length>width){lines.push(line);line=word;}else line=(line+' '+word).trim();}
    if(line)lines.push(line);return lines.length?lines:[''];
  }
  function reportPdf({name,scenario,date,inputs,groups,notes,primaryLabel,primary}){
    const navy='0.075 0.15 0.28',blue='0.20 0.35 0.57',muted='0.40 0.48 0.60',red='0.73 0.18 0.25',pale='0.93 0.96 0.995',ink='0.12 0.20 0.32';
    const pages=[];let ops=[],y=0,pageNumber=0;
    const rect=(x,b,w,h,color)=>ops.push(color+' rg '+x+' '+b+' '+w+' '+h+' re f');
    const text=(str,x,b,size=10,font='F1',color=ink)=>ops.push('BT /'+font+' '+size+' Tf '+color+' rg 1 0 0 1 '+x+' '+b+' Tm ('+escape(str)+') Tj ET');
    function startPage(){
      pageNumber++;ops=[];
      rect(0,748,595,94,navy);rect(39,774,34,34,'0.18 0.30 0.49');text('EB',46,785,16,'F3','0.83 0.90 1');
      text('ESTATE BASICS',86,798,14,'F2','1 1 1');text('PROPERTY PLANNING  /  PRIVATE REPORT',86,782,7.4,'F1','0.68 0.79 0.94');
      text('YOUR NEXT CHAPTER, CONSIDERED.',39,730,8,'F1',muted);
      y=705;
    }
    function nextPage(){pages.push(ops.join('\n'));startPage();}
    function ensure(height){if(y-height<64)nextPage();}
    function line(str,size=10,bold=false,color=ink){ensure(size+8);text(str,40,y,size,bold?'F2':'F1',color);y-=size+8;}
    function section(title,continued=false){
      ensure(64);y-=12;rect(39,y-9,517,29,pale);text(title+(continued?' / continued':''),51,y,12,'F2',blue);y-=30;
    }
    startPage();
    wrap(name,38).forEach(l=>{ensure(34);text(l,39,y,25,'F3',navy);y-=32;});
    line(scenario,11,false,blue);line('Prepared '+date,8,false,muted);y-=8;
    ensure(90);rect(39,y-67,517,78,navy);text(primaryLabel.toUpperCase(),54,y-9,8,'F2','0.73 0.84 1');text(primary,54,y-45,28,'F3','1 1 1');text('SGD  /  ESTIMATE ONLY',406,y-46,7.5,'F1','0.73 0.84 1');y-=94;
    for(const group of groups){
      section(group.title);
      let stripe=false;
      for(const r of group.rows){
        const lines=wrap(r.label,62),height=Math.max(27,lines.length*13+12);
        if(y-height<64){nextPage();section(group.title,true);}
        const top=y+7;
        if(r.kind==='total'||r.kind==='subtotal')rect(39,y-height+14,517,height,pale);
        else if(stripe)rect(39,y-height+14,517,height,'0.979 0.986 0.998');
        const color=r.red?red:ink,font=r.bold?'F2':'F1';
        lines.forEach((l,i)=>text(l,49,y-i*13,9.3,font,color));
        const amount=ascii(r.amount);
        const units=[...amount].reduce((sum,ch)=>sum+(/[0-9$]/.test(ch)?556:ch===','||ch==='.'?278:ch==='-'?333:556),0);
        text(amount,544-units*9.5/1000,y-(lines.length-1)*13,9.5,font,color);
        y-=height;stripe=!stripe;
      }
    }
    section('Figures entered');
    for(const r of inputs){const lines=wrap(r.label+': '+r.value,85);ensure(lines.length*16+5);lines.forEach(l=>line(l,9,false,muted));}
    if(notes){section('Planning notes');for(const paragraph of notes.split(/\r?\n/))wrap(paragraph,89).forEach(l=>line(l,9.5));}
    ensure(310);section('Assumptions & calculation notes');
    for(const p of [
      'Automatic loan amount starts at 75% of purchase price. The loan used is capped at 75% of the lower price or valuation. A lower edited approval reduces financing.',
      'Cash-over-valuation and the bank minimum cash downpayment cannot use CPF or grants. Actual loan and CPF eligibility may be lower than these estimates.',
      'Downpayment, COV and loan top-up rows are explanatory guides already within the purchase requirement. Do not add them again.',
      'Commission may include 9% GST or exclude GST, according to the selected option. An edited commission total replaces the percentage calculation.',
      'Stamp duties use the higher price or market value. Confirm grants, CPF limits, duties, financing and payment timing before committing.',
      'Generated on your device. Your saved figures are held in your browser; keep a separate backup if needed.'
    ]){wrap(p,94).forEach(l=>line(l,8.3,false,muted));y-=3;}
    pages.push(ops.join('\n'));
    const objects=['<< /Type /Catalog /Pages 2 0 R >>','', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>','<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>'];
    const kids=[];
    pages.forEach((stream,i)=>{
      const pageId=objects.length+1,streamId=pageId+1;kids.push(pageId+' 0 R');
      stream+='\n'+navy+' rg 39 42 517 0.6 re f\nBT /F1 7 Tf '+muted+' rg 1 0 0 1 39 27 Tm (ESTATE BASICS  /  PRIVATE PLANNING REPORT) Tj ET\nBT /F1 7 Tf '+muted+' rg 1 0 0 1 509 27 Tm ('+(i+1)+' / '+pages.length+') Tj ET';
      objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents '+streamId+' 0 R >>');
      objects.push('<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream');
    });
    objects[1]='<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+pages.length+' >>';
    let pdf='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\n'+o+'\nendobj\n';});
    const xref=pdf.length;pdf+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n';for(const o of offsets.slice(1))pdf+=String(o).padStart(10,'0')+' 00000 n \n';pdf+='trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
    return new TextEncoder().encode(pdf);
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={reportPdf,wrap};else root.PropertyPdf={reportPdf};
})(typeof globalThis!=='undefined'?globalThis:this);
