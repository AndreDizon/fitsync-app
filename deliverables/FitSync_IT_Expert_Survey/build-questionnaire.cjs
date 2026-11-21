const fs = require('node:fs');
const path = require('node:path');
const modules = process.env.FITSYNC_DOCUMENT_MODULES || path.join(process.env.TEMP, 'fitsync-presentation-tools', 'node_modules');
const documentRequire = require('node:module').createRequire(path.join(modules, '..', 'package.json'));
const PDFDocument = documentRequire('pdfkit');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, PageBreak } = documentRequire('docx');
const data = require('./questionnaire-v3.json');
const stem = 'FitSync_IT_Expert_Questionnaire_V3';
const intro = [
  ['Purpose and consent', 'We invite you to evaluate FitSync after a guided demonstration, hands-on testing and review of relevant technical evidence. Participation is voluntary. You may leave an item unanswered or stop participating. Evaluator information will be used for this academic study and handled confidentially by the research team. Signing below indicates your agreement to participate.'],
  ['Evaluated scope', 'Onboarding; rule-based workout and nutrition planning; one-day and one-week playlists; exercise and food libraries; task and water logging; analytics; measurements and wellness check-ins; private photo timeline; achievements and share cards; forum and people introductions; reminders; account security; optional AI chat. Gym location search, GPS/directions and camera-based food scanning are excluded.'],
  ['How to answer', 'Rate each statement using the evidence you observed. Use NO (Not observed) if a feature was not tested or technical evidence was unavailable. Do not assume a capability works because a technology is listed. NO and blank responses are excluded from the mean; report how many ratings were received per item.'],
  ['Evidence for technical items', 'Access rules, encryption, key handling, maintainability and deployment require code/configuration review or controlled tests. Visual inspection alone is insufficient. Test private-data isolation with two disposable accounts. Keep real credentials and personal records out of the evaluation.']
];
const scale = [
  ['4', 'Strongly Agree', '3.26-4.00', 'Highly Acceptable'],
  ['3', 'Agree', '2.51-3.25', 'Acceptable'],
  ['2', 'Disagree', '1.76-2.50', 'Fairly Acceptable'],
  ['1', 'Strongly Disagree', '1.00-1.75', 'Not Acceptable'],
  ['NO', 'Not observed', 'Not scored', 'Insufficient evidence']
];
const blue = '#263F56', gold = '#FFE139', ink = '#252829';
const pdf = new PDFDocument({size:'A4', margin:42, bufferPages:true, info:{Title:data.title, Author:'KEYSTOKES'}});
const output = fs.createWriteStream(path.join(__dirname, stem+'.pdf'));
pdf.pipe(output);
function heading(title, subtitle) {
  pdf.rect(0,0,595.28,9).fill(gold);
  pdf.font('Helvetica-Bold').fontSize(17).fillColor(blue).text(title,42,31,{width:511});
  pdf.font('Helvetica').fontSize(9).fillColor(ink).text(subtitle,42,pdf.y+7,{width:511});
  pdf.y += 15;
}
function paragraph(title,body) {
  pdf.font('Helvetica-Bold').fontSize(10).fillColor(blue).text(title,42,pdf.y,{width:511});
  pdf.font('Helvetica').fontSize(9).fillColor(ink).text(body,42,pdf.y+5,{width:511,lineGap:2}); pdf.y+=12;
}
heading('IT EXPERT TECHNICAL EVALUATION',data.subtitle+'\n'+data.version+'\n'+data.framework);
paragraph('Research team','Christian Andre R. Dizon | Coeli Therese G. Brillante | Loraine Ann S. Escritor | Brian Noel M. Mendoza\nBS Information Technology | University of the Assumption, Pampanga');
paragraph(...intro[0]);
paragraph('Evaluator profile','Name/title (optional): ___________________________________   Date: ______________\nSpecialization/role: __________________________   IT experience (years): __________\nConsent signature: __________________________   Test browser/device: ___________');
paragraph(...intro[1]);
paragraph(...intro[2]);
pdf.font('Helvetica-Bold').fontSize(10).fillColor(blue).text('Rating scale',42,pdf.y);
scale.forEach(row=>{pdf.font('Helvetica').fontSize(9).fillColor(ink).text(row.join('  |  '),42,pdf.y+6,{width:511});}); pdf.y+=13;
paragraph(...intro[3]);
function category(cat,index) {
  const x=42,w=511;
  const y=pdf.y;
  pdf.roundedRect(x,y,w,36,5).fill(blue);
  pdf.font('Helvetica-Bold').fontSize(11).fillColor('white').text(`${index+1}. ${cat.name}`,x+10,y+7,{width:490});
  pdf.font('Helvetica').fontSize(8).fillColor('white').text(cat.focus,x+10,y+22,{width:490});
  pdf.y=y+44;
  const cols=[333,35.6,35.6,35.6,35.6,35.6];
  const labels=['Technical indicator','4 / SA','3 / A','2 / D','1 / SD','NO'];
  let at=x,hy=pdf.y;
  labels.forEach((label,i)=>{pdf.rect(at,hy,cols[i],23).fillAndStroke('#F1F3F5','#CAD0D5');pdf.font('Helvetica-Bold').fontSize(8).fillColor(ink).text(label,at+5,hy+8,{width:cols[i]-10,align:i?'center':'left'});at+=cols[i];});
  pdf.y=hy+23;
  cat.items.forEach((item,j)=>{
    const text=`${index+1}.${j+1}  ${item}`;
    pdf.font('Helvetica').fontSize(9);
    const h=Math.max(50,pdf.heightOfString(text,{width:313,lineGap:2})+18);
    let cx=x;const cy=pdf.y;
    cols.forEach((cw,i)=>{pdf.rect(cx,cy,cw,h).fillAndStroke(j%2?'#F8F9FA':'#FFFFFF','#CAD0D5');if(i===0){pdf.font('Helvetica').fontSize(9).fillColor(ink).text(text,cx+9,cy+8,{width:cw-18,lineGap:2});}else{pdf.rect(cx+cw/2-5,cy+h/2-5,10,10).lineWidth(.6).stroke('#727C84');}cx+=cw;});
    pdf.y=cy+h;
  });
  pdf.y+=13;
}
for(let p=0;p<4;p++){
  pdf.addPage();heading('SOFTWARE PRODUCT QUALITY',data.framework+'\nMark one response per statement. NO = not observed; leave untested claims unscored.');
  category(data.categories[p*2],p*2); category(data.categories[p*2+1],p*2+1);
  pdf.font('Helvetica-Bold').fontSize(9).fillColor(blue).text('Evidence, issues or recommendations:',42,pdf.y);
  for(let n=0;n<2;n++){pdf.y+=20;pdf.moveTo(42,pdf.y).lineTo(553,pdf.y).strokeColor('#CCD2D7').stroke();}
}
const range=pdf.bufferedPageRange();
for(let i=0;i<range.count;i++){pdf.switchToPage(i);pdf.font('Helvetica').fontSize(8).fillColor('#59636C').text(`KEYSTOKES | FitSync evaluation V3                                     Page ${i+1} of ${range.count}`,42,804,{lineBreak:false});}
pdf.end();

const children=[];
function p(text,bold=false){return new Paragraph({children:[new TextRun({text,bold,size:bold?22:20})],spacing:{after:120}});}
children.push(p(data.title,true),p(data.subtitle),p(data.version),p(data.framework));
children.push(p('Research team',true),p('Christian Andre R. Dizon; Coeli Therese G. Brillante; Loraine Ann S. Escritor; Brian Noel M. Mendoza. BSIT, University of the Assumption, Pampanga.'));
children.push(p(intro[0][0],true),p(intro[0][1]),p('Evaluator profile',true),p('Name/title (optional): ____________________  Date: __________'),p('Role: __________________  Years of IT experience: _____'),p('Consent signature: __________________  Browser/device: __________________'));
for(const [title,body] of intro.slice(1))children.push(p(title,true),p(body));
children.push(p('Scale: 4 = Strongly Agree; 3 = Agree; 2 = Disagree; 1 = Strongly Disagree; NO = Not observed.'));
children.push(p('Mean interpretation: 3.26-4.00 Highly Acceptable; 2.51-3.25 Acceptable; 1.76-2.50 Fairly Acceptable; 1.00-1.75 Not Acceptable.'));
data.categories.forEach((cat,i)=>{
  if(i%2===0)children.push(new Paragraph({children:[new PageBreak()]}));
  children.push(p(`${i+1}. ${cat.name}`,true),p(cat.focus));
  const rows=[['Technical indicator','4','3','2','1','NO'],...cat.items.map((item,j)=>[`${i+1}.${j+1} ${item}`,'','','','',''])];
  children.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:rows.map((row,r)=>new TableRow({cantSplit:true,tableHeader:r===0,children:row.map((cell,c)=>new TableCell({width:{size:c===0?70:6,type:WidthType.PERCENTAGE},children:[p(cell,r===0)]}))}))}));
  children.push(p('Evidence / recommendations: __________________________________________'));
});
Packer.toBuffer(new Document({sections:[{properties:{},children}]})).then(buf=>fs.writeFileSync(path.join(__dirname,stem+'.docx'),buf));
let md=`# ${data.title}\n\n${data.subtitle}\n\n${data.version}\n\n${data.framework}\n\n`;
for(const [title,body] of intro)md+=`## ${title}\n\n${body}\n\n`;
md+='## Evaluator profile\n\nName/title (optional): __________  Date: __________\n\nRole: __________  Years of IT experience: ____  Consent signature: __________\n\nTest device/browser: __________\n\n## Rating scale\n\n| Rating | Response | Mean range | Interpretation |\n|---|---|---|---|\n'+scale.map(r=>'| '+r.join(' | ')+' |').join('\n')+'\n\n';
data.categories.forEach((cat,i)=>{md+=`## ${i+1}. ${cat.name}\n\n${cat.focus}\n\n| Technical indicator | 4 | 3 | 2 | 1 | NO |\n|---|---|---|---|---|---|\n`;cat.items.forEach((item,j)=>md+=`| ${i+1}.${j+1} ${item} | | | | | |\n`);md+='\nEvidence / recommendations: __________________________________\n\n';});
fs.writeFileSync(path.join(__dirname,stem+'.md'),md);
output.on('finish',()=>console.log(`Created ${stem}.pdf, .docx and .md; PDF pages: ${range.count}; indicators: ${data.categories.reduce((sum,c)=>sum+c.items.length,0)}`));
