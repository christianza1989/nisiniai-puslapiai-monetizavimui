import fs from 'node:fs/promises';
import {bodyPlainText} from 'file:///C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/content-package-v2.mjs';
const here=new URL('.',import.meta.url),sel=JSON.parse(await fs.readFile(new URL('SELECTION.json',here),'utf8'));
process.env.STUDIO_DATA_DIR=sel.privateStudio;process.env.STUDIO_OUTPUT_DIR=sel.privateStudio+'/output';
const {getSite,listJobs,editPage}=await import('file:///C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/model.mjs');
if((await listJobs()).some(j=>j.siteId==='madbeauty'&&['running','queued'].includes(j.status)))throw Error('Writer active');
const changes=[];
const metadata={
 'MD-gidas':{title:'Dermatologo ir medicinos estetikos konsultacijos: skirtumai'},
 'PS-gidas':{title:'Psichologas, psichoterapija, porų ir šeimos konsultacija: skirtumai'},
 'SV-gidas':{title:'Meditacija, kvėpavimas ir garso seansai: formatai ir įrodymų ribos'},
 'DP-ar-lazeris':{title:'Depiliacija vašku ar lazerinis plaukų šalinimas: skirtumai'},
 'PX-gidas':{description:'Palyginkite plaukų priauginimą keratino jungtimis ir lipniomis juostelėmis: tvirtinimą, norimą vaizdą, priežiūrą, korekciją bei nuėmimą.'},
 'TT-gidas':{description:'Tatuiruotės motyvas, vieta, mastelis ir eskizas: kaip įvardyti pageidavimą, palyginti darbo apimtį bei patikrinti teikėjo ir pigmento informaciją.'}
};
for(const i of sel.pages){
 const p=(await getSite('madbeauty')).pages.find(p=>p.id===i.pageId),body=structuredClone(p.body),groups=new Set(p.media.map(m=>m.groupId));if(groups.size!==1)throw Error('Review multi-image layout separately');
 let spaces=0,minorCorrections=0;
 const nodes=row=>{for(let k=1;k<row.length;k++)if(/[\p{L}\p{N}.!?;:]$/u.test(row[k-1].text)&&/^[\p{L}\p{N}„“]/u.test(row[k].text)){row[k].text=' '+row[k].text;spaces++;}};
 for(const b of body){
  const fix=text=>{let next=text;if(i.planId==='AV-gidas')next=next.replace(/^klauskite/,'Klauskite').replace(/^ klauskite/,' Klauskite');if(i.planId==='PS-gidas')next=next.replaceAll('pas konkretaus teikėjo','pas konkretų teikėją');if(i.planId==='ES-mezoterapija-biorevitalizacija')next=next.replaceAll('мэдээлimą','informaciją');if(i.planId==='FX-joga-pilatesas')next=next.replaceAll('neaiškiaks','neaiškų').replaceAll('Эti aprašo požymiai','Šie aprašo požymiai');if(i.planId==='OD-balinimas')next=next.replaceAll('Restauraciją keisti reikės гэж iš anksto nuspręsti negalima.','Kad restauraciją reikės keisti, iš anksto nuspręsti negalima.');if(i.planId==='LZ-lazeris-ipl')next=next.replace(' ir nesuteikia galimybės užsakyti procedūrą per Madbeauty','');if(next!==text)minorCorrections++;return next;};
  const dates=text=>{
   let next=['OD-gidas','SP-galvos-spa'].includes(i.planId)?text.replaceAll('2026 m. spalio 9 d.','2026 m. spalio 10 d.').replaceAll('2026-10-09','2026-10-10'):text;
   if(['SP-gidas','KP-kaina-trukme','SP-hamamas','KP-sveitimas'].includes(i.planId))next=next.replaceAll('Kese šveitimas ir aliejaus masažas','Kese šveitimas ir kūno sutepimas').replaceAll('Kese šveitimas su aliejaus masažu','Kese šveitimas su kūno sutepimu');
   if(next!==text)minorCorrections++;return next;
  };
  const eyebrow=text=>{let next=text;if(i.planId==='PM-antakiai')next=next.replaceAll('mida teikėjas','ką teikėjas').replaceAll('o mida reikėtų','o ką reikėtų').replaceAll('Šis meniu parodo, kaip vienas teikėjas grupuoja savo pasiūlymus','Šie kategorijos įrašai parodo skirtingus paslaugų formatus');if(next!==text)minorCorrections++;return next;};
  const spacing=text=>{let next=i.planId==='PX-korekcija-nuemimas'?text.replaceAll('įskaičiuotas.Ar','įskaičiuotas. Ar'):text;if(i.planId==='NP-formos-tipsai')next=next.replaceAll('minkšto gelio tipas su','minkšto gelio tipsas su');if(i.planId==='GL-ar-stiprinimas')next=next.replaceAll('Norite padengti natūralų nagą, nekurdamas papildomo ilgio?','Norite padengti natūralų nagą nepridėdami papildomo ilgio?');if(next!==text)minorCorrections++;return next;};
  if(b.text)b.text=spacing(eyebrow(dates(fix(b.text))));if(b.content){for(const n of b.content)n.text=spacing(eyebrow(dates(fix(n.text))));nodes(b.content);}if(b.type==='richList')for(const row of b.items){for(const n of row)n.text=spacing(eyebrow(dates(fix(n.text))));nodes(row);}
  if(b.type==='list')b.items=b.items.map(t=>spacing(eyebrow(dates(fix(t)))));
 }
 let joined=0;for(let k=0;k<body.length-1;k++)if(body[k].type==='paragraph'&&/rasite\s*$/u.test(body[k].text)&&body[k+1].type==='richParagraph'){body[k]={type:'richParagraph',content:[{type:'text',text:body[k].text+' '},...body[k+1].content]};body.splice(k+1,1);joined++;}
 const removed=body.filter(b=>b.type==='image').length,final=body.filter(b=>b.type!=='image');
 await editPage('madbeauty',p.id,{...metadata[i.planId],body:final,editorial:{...p.editorial,dateModified:null,readingMinutes:Math.max(1,Math.ceil(bodyPlainText(final).split(/\s+/).length/200))}});
 changes.push({planId:i.planId,typedLinkSpacingCorrections:spaces,minorCorrections,metadataShortened:metadata[i.planId]||null,joinedLinkParagraphs:joined,duplicateInlineFeaturedPhotosRemoved:removed,basis:'Luna authored content; editor spelling/spacing/metadata/layout only. Corrected S101 Kese component to actual body application and local source dates OD11/SP40 to Oct10. Removed unsupported universal platform-booking assertion in46; no new clinical claim added.'});
}
await fs.writeFile(new URL('COPYEDIT.json',here),JSON.stringify({checkedAt:new Date().toISOString(),changes},null,2)+'\n');console.log({pages:changes.length});
