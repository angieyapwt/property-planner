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
  function reportFilename(name,date=new Date()){
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Singapore',day:'2-digit',month:'short',year:'2-digit'}).formatToParts(date),part=type=>parts.find(p=>p.type===type).value;
    const safe=String(name||'Untitled').replace(/[\\/:*?"<>|\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,80)||'Untitled';
    return 'Property Planner - '+safe+' - '+part('day')+part('month')+part('year');
  }
  function reportPdf(options){
    const {name,date}=options,documents=options.documents?.length?options.documents:[options],combined=documents.length>1;
    const navy='0.075 0.15 0.28',blue='0.20 0.35 0.57',muted='0.40 0.48 0.60',red='0.73 0.18 0.25',pale='0.93 0.96 0.995',ink='0.12 0.20 0.32';
    const pages=[];let ops=[],y=0,pageNumber=0;
    const rect=(x,b,w,h,color)=>ops.push(color+' rg '+x+' '+b+' '+w+' '+h+' re f');
    const text=(str,x,b,size=10,font='F1',color=ink)=>ops.push('BT /'+font+' '+size+' Tf '+color+' rg 1 0 0 1 '+x+' '+b+' Tm ('+escape(str)+') Tj ET');
    function startPage(){
      pageNumber++;ops=[];
      rect(0,748,595,94,navy);rect(39,774,34,34,'0.18 0.30 0.49');text('EB',46,785,16,'F3','0.83 0.90 1');
      text('ESTATE BASICS',86,798,14,'F2','1 1 1');text('PROPERTY PLANNING  /  PRIVATE REPORT',86,782,7.4,'F1','0.68 0.79 0.94');
      if(combined){text(ascii(name).slice(0,45),39,730,8,'F1',muted);text(date,370,730,8,'F1',muted);}else text('YOUR NEXT CHAPTER, CONSIDERED.',39,730,8,'F1',muted);
      y=705;
    }
    function nextPage(){pages.push(ops.join('\n'));startPage();}
    function ensure(height){if(y-height<64)nextPage();}
    function line(str,size=10,bold=false,color=ink){ensure(size+8);text(str,40,y,size,bold?'F2':'F1',color);y-=size+8;}
    function section(title,continued=false){
      ensure(64);y-=12;rect(39,y-9,517,29,pale);text(title+(continued?' / continued':''),51,y,12,'F2',blue);y-=30;
    }
    startPage();
    if(combined){
      y=675;line('YOUR COMPLETE PROPERTY PLAN',10,true,blue);y-=16;
      wrap(name,32).forEach(l=>{text(l,39,y,30,'F3',navy);y-=39;});
      y-=14;line('Property Planner + Affordability Assessment',13,false,blue);
      line('Prepared '+date,9,false,muted);y-=34;
      for(const [index,doc]of documents.entries()){
        section(String(index+1).padStart(2,'0')+' / '+doc.title);
        wrap(doc.scenario,68).forEach(l=>line(l,10,false,muted));
        ensure(86);rect(39,y-64,517,76,navy);
        text(doc.primaryLabel.toUpperCase(),54,y-8,8,'F2','0.73 0.84 1');
        text(doc.primary,54,y-43,27,'F3','1 1 1');y-=92;
      }
      y-=12;wrap('Two perspectives, one private report. Your transaction calculation and borrowing assessment are shown as separate sections, using the current figures in each workspace.',88).forEach(l=>line(l,10,false,muted));
      y-=18;wrap('Financing estimates depend on the assumptions in each section. Differences in loan amount or property price are retained for comparison.',88).forEach(l=>line(l,9,false,muted));
    }
    for(const [index,doc]of documents.entries()){
    if(combined){nextPage();line(String(index+1).padStart(2,'0')+' / '+doc.title.toUpperCase(),10,true,blue);y-=14;}
    const {scenario,inputs=[],groups=[],notes,primaryLabel,primary,assumptions}=doc;
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
    for(const p of (assumptions||[
      'Automatic loan amount starts at 75% of purchase price. The loan used is capped at 75% of the lower price or valuation. A lower edited approval reduces financing.',
      'Cash-over-valuation and the bank minimum cash downpayment cannot use CPF or grants. Actual loan and CPF eligibility may be lower than these estimates.',
      'Downpayment, COV and loan top-up rows are explanatory guides already within the purchase requirement. Do not add them again.',
      'Commission may include 9% GST or exclude GST, according to the selected option. An edited commission total replaces the percentage calculation.',
      'Stamp duties use the higher price or market value. Confirm grants, CPF limits, duties, financing and payment timing before committing.',
      'Generated on your device. Your saved figures are held in your browser; keep a separate backup if needed.'
    ])){wrap(p,94).forEach(l=>line(l,8.3,false,muted));y-=3;}
    }
    pages.push(ops.join('\n'));
    return encodePages(pages,595,842,navy,muted);
  }
  function encodePages(pages,width,height,navy,muted){
    const objects=['<< /Type /Catalog /Pages 2 0 R >>','', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding << /BaseEncoding /WinAnsiEncoding /Differences [128 /minus /approxequal] >> >>','<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>'];
    const kids=[];
    pages.forEach((stream,i)=>{
      const pageId=objects.length+1,streamId=pageId+1;kids.push(pageId+' 0 R');
      stream+='\n'+navy+' rg 39 42 '+(width-78)+' 0.6 re f\nBT /F1 7 Tf '+muted+' rg 1 0 0 1 39 27 Tm (ESTATE BASICS  /  PRIVATE PLANNING REPORT) Tj ET\nBT /F1 7 Tf '+muted+' rg 1 0 0 1 '+(width-86)+' 27 Tm ('+(i+1)+' / '+pages.length+') Tj ET';
      objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+width+' '+height+'] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents '+streamId+' 0 R >>');
      objects.push('<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream');
    });
    objects[1]='<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+pages.length+' >>';
    let pdf='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\n'+o+'\nendobj\n';});
    const xref=pdf.length;pdf+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n';for(const o of offsets.slice(1))pdf+=String(o).padStart(10,'0')+' 00000 n \n';pdf+='trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
    return new TextEncoder().encode(pdf);
  }
  function clientReport(data){
    const navy='0.075 0.15 0.28', blue='0.20 0.35 0.57', muted='0.36 0.44 0.55';
    const pale='0.93 0.96 0.995', white='1 1 1', red='0.72 0.18 0.24', green='0.12 0.42 0.29';
    const ops=[];
    function box(x,y,w,h,color){ops.push(color+' rg '+[x,y,w,h].join(' ')+' re f');}
    function text(value,x,y,size=10,font='F1',color=navy){
      const encoded = font==='F2'
        ? String(value).split(/([−≈])/).map(part=>part==='−'?'\\200':part==='≈'?'\\201':escape(part)).join('')
        : escape(value);
      ops.push('BT /'+font+' '+size+' Tf '+color+' rg 1 0 0 1 '+x+' '+y+' Tm ('+encoded+') Tj ET');
    }
    function right(value,x,y,bold,color){
      const width=[...ascii(value)].reduce((sum,ch)=>sum+(/[0-9$]/.test(ch)?5.56:ch===','||ch==='.'?2.78:5.56),0);
      const size=value.length>27?8.5:10;
      text(value,x-width*size/10,y,size,bold?'F2':'F1',color);
    }
    box(0,496,842,99,navy);
    text('ESTATE BASICS  /  PRIVATE CLIENT REPORT',39,568,9,'F2','0.75 0.85 1');
    text(data.title,39,533,data.title.length>30?22:25,'F3',white);
    text(data.property,40,511,10,'F2',white);
    text(data.date,682,568,9,'F1',white);
    if(data.client)text('Prepared for '+data.client,40,481,10,'F2');
    if(data.address)text(data.address,40,467,9,'F1',muted);
    data.highlights.forEach(([label,value],index)=>{
      const x=39+index*257;
      box(x,413,250,46,pale);
      text(label.toUpperCase(),x+12,442,8,'F2',blue);
      text(value,x+12,423,16,'F3');
    });
    box(39,377,470,24,pale);
    text('PURCHASE & FUNDING',50,385,10,'F2',blue);
    const rowSpacing=Math.min(15,195/Math.max(data.purchase.length-1,1));
    data.purchase.forEach(({label,value,bold,alert},i)=>{
      const y=361-i*rowSpacing;
      if(i%2===0)box(39,y-3,470,rowSpacing-1,'0.976 0.983 0.996');
      text(label,50,y,9,bold?'F2':'F1',alert?red:navy);
      right(value,498,y,bold,alert?red:navy);
    });
    box(525,377,278,24,pale);
    text('MONTHLY MORTGAGE',536,385,10,'F2',blue);
    text(data.tenure,536,358,10,'F1',muted);
    data.mortgage.forEach(([label,amount],i)=>{
      const y=285-i*66;
      box(525,y,278,54,pale);
      text(label.replace(' · ',' / '),536,y+35,9,'F2',blue);
      text(amount,536,y+12,19,'F3');
    });
    data.totals.forEach(({label,value,balance},i)=>{
      const x=39+i*386;
      box(x,104,378,54,pale);
      text(label.toUpperCase(),x+12,143,8,'F2',blue);
      text(value,x+12,119,17,'F3');
      const color=balance.tone==='shortfall'?red:balance.tone==='remaining'?green:muted;
      text(balance.label,x+166,143,8,'F2',color);
      text(balance.value,x+166,119,15,'F3',color);
    });
    let y=96;
    for(const line of wrap(data.notes,92).slice(0,2)){
      if(line){text(line,40,y,8,'F1',navy);y-=10;}
    }
    for(const note of data.footnotes){
      for(const line of wrap(note,130)){text(line,40,y,8,'F1',muted);y-=10;}
    }
    return encodePages([ops.join('\n')],842,595,navy,muted);
  }
  function combinedReport({name,date,planner,assessment}){
    if(!planner||!assessment)throw new Error('Both calculations are required.');
    return reportPdf({name,date,documents:[{...planner,title:'Property Planner'},{...assessment,title:'Affordability Assessment'}]});
  }
  function purchaseBudget(data, now = new Date()){
    const navy='0.075 0.15 0.28', muted='0.36 0.44 0.55', blue='0.20 0.35 0.57';
    const white='1 1 1', pale='0.93 0.96 0.995', stripe='0.975 0.982 0.995';
    const red='0.66 0.20 0.27', green='0.08 0.37 0.25';
    const date=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Singapore',day:'2-digit',month:'short',year:'numeric'}).format(now);
    const pages=[];
    let ops=[];
    const box=(x,y,w,h,color)=>ops.push(color+' rg '+[x,y,w,h].join(' ')+' re f');
    const text=(value,x,y,size=10,font='F1',color=navy)=>
      ops.push('BT /'+font+' '+size+' Tf '+color+' rg 1 0 0 1 '+x+' '+y+' Tm ('+escape(value)+') Tj ET');
    const balanceColor=balance=>balance?.tone==='budget-gap'?red:green;
    function header(title,subtitle){
      ops=[];
      box(0,497,842,98,navy);
      text('ESTATE BASICS  /  PURCHASE PLANNING',40,566,9,'F2','0.75 0.85 1');
      text(date,696,566,9,'F1',white);
      text(title,40,534,26,'F3',white);
      text(subtitle,40,513,10,'F1','0.80 0.88 1');
    }
    function cards(items){
      const width=764/items.length;
      items.forEach(([label,value,color],index)=>{
        const x=39+width*index;
        box(x,423,width-7,52,pale);
        text(label.toUpperCase(),x+12,455,8,'F2',blue);
        text(value,x+12,433,18,'F3',color);
      });
    }
    function table(headers,rows,columns,emphasisColumn){
      box(39,378,764,27,navy);
      headers.forEach((label,i)=>text(label,columns[i],388,9,'F2',white));
      rows.forEach((row,index)=>{
        const y=378-index*22;
        if(row.key || index%2===0) box(39,y-22,764,22,row.key?pale:stripe);
        text(row.label,columns[0],y-15,10,row.key?'F2':'F1');
        row.values.forEach((value,i)=>text(value,columns[i+1],y-15,10,row.key||i>=emphasisColumn?'F2':'F1'));
        if(row.balance)text(row.balance.text,columns.at(-1),y-15,10,'F2',balanceColor(row.balance));
      });
    }
    header('Purchase Budget','10-year projection  /  '+data.propertyType);
    cards([
      ['Max purchase price today',data.now],['Price if Max Loan covers 75%',data.benchmark],
      ...(data.targetToday?[['Target cash balance today',data.targetToday.text,balanceColor(data.targetToday)]]:[])
    ]);
    table(data.projectionHeaders,data.projectionRows,data.target?[51,125,235,365,468,563,690]:[51,145,275,420,560,680],3);
    if(data.target){
      text('Target purchase price  '+data.targetPrice+'  /  '+data.timing,40,114,10,'F2');
      text('Negative amounts show cash top-up needed after CPF OA. Positive amounts show cash remaining.',40,95,9,'F1',muted);
    }
    text('Annual salary increment '+data.salaryIncrease+'. Monthly CPF OA and cash additions grow at this rate from Year 2.',40,74,9,'F1',muted);
    text(data.loanProjectionNote,40,59,9,'F1',muted);
    pages.push(ops.join('\n'));

    header('Purchase Cost Breakdown',data.propertyType+'  /  Funding shown for '+data.yearLabel);
    cards([
      ['Max Loan',data.maxLoan],['CPF OA available',data.oa],['Cash savings available',data.cash],
      ...(data.targetForYear?[['Target cash balance',data.targetForYear.text,balanceColor(data.targetForYear)]]:[])
    ]);
    table(data.costHeaders.map(label=>label.replace(' · ',' / ')),data.costRows,data.target?[51,335,505,680]:[51,389,625]);
    if(data.noPurchase)text(data.noPurchase,40,112,9,'F2',muted);
    text('Assumes a first bank loan at up to 75% of the price, with valuation equal to purchase price.',40,94,9,'F1',muted);
    text('Cash requirement includes the minimum cash downpayment, agent fees and miscellaneous fees.',40,77,9,'F1',muted);
    text('Stamp duty may need to be paid in cash before CPF reimbursement. All amounts are in SGD.',40,60,9,'F1',muted);
    pages.push(ops.join('\n'));
    return encodePages(pages,842,595,navy,muted);
  }
  const api={reportPdf,combinedReport,clientReport,purchaseBudget,wrap,filename:reportFilename};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PropertyPdf=api;
})(typeof globalThis!=='undefined'?globalThis:this);
