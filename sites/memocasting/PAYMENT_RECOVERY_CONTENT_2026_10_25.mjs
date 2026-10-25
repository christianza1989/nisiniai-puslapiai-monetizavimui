import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=import.meta.dirname,pub=path.resolve(root,'../../../dovanos-memorycasting'),qa=root+'/qa/final-seo-20261025';
process.env.STUDIO_DATA_DIR=root+'/studio-data';process.env.STUDIO_OUTPUT_DIR=root+'/studio-output';
process.env.STUDIO_NETWORK_SETTINGS=pub+'/config/niche-network.json';process.env.STUDIO_PUBLIC_CORE_DIR=pub;
const model=await import('../../content-studio/src/model.mjs');
const phase=process.argv[2]||'inspect',id='887515ad-a6dd-4d47-a3cd-d884a5ccc3a4';
const baselineBytes=await fs.readFile(qa+'/recovery-before-package.private.json').catch(e=>{if(e.code!=='ENOENT')throw e;return fs.readFile(pub+'/content-packages/memocasting/content-package.json');});
assert.equal(createHash('sha256').update(baselineBytes).digest('hex'),'03c1893367547e524cc1546ee9c683056916112788668ce8c50e175918765646');
const baseline=JSON.parse(baselineBytes),old=baseline.pages.find(p=>p.id===id);
const added=[
 {type:'heading',level:2,text:'Nebaigto apmokėjimo priminimas'},
 {type:'paragraph',text:'Kai pateikiate užsakymą ir pradedate apmokėjimą, tačiau jo neužbaigiate, po 12 valandų galime atsiųsti vieną neutralų priminimą pateiktu el. paštu. Prieš siųsdami patikriname mokėjimo ir užsakymo būseną. Priminimo nesiunčiame už apmokėtą, atšauktą ar pasibaigusį užsakymą. Jame nėra nuolaidų, papildomų pasiūlymų ar reklaminio sekimo; daugiau priminimų dėl šio užsakymo nesiunčiame. Vien el. pašto įvedimas nepateikus užsakymo priminimo neįjungia.'},
 {type:'paragraph',text:'Priminimui naudojame užsakymo identifikatorių, el. paštą ir techninę apmokėjimo būseną. Pagrindas – mūsų teisėtas interesas padėti užbaigti jūsų pradėtą užsakymą. Apie vieną priminimą informuojame užsakymo formoje. Tai nėra naujienlaiškio prenumerata ar sutikimas rinkodarai. Dėl tokio tvarkymo galite nesutikti kreipdamiesi info@memorycasting.lt.'},
 {type:'paragraph',text:'Naujo užsakymo apmokėjimo ir prekių rezervavimo laikas – 24 valandos. Laiško nuoroda gali galioti iki 30 dienų, tačiau ji nepratęsia rezervacijos. Pasibaigus apmokėjimo laikui, nuoroda gali padėti atkurti krepšelį: prieš naują užsakymą iš naujo tikrinami likučiai, kainos ir pristatymas, o pirkimo sąlygas patvirtinate patys. Nuoroda suteikia ribotą prieigą prie užsakymo, todėl nesidalykite ja su kitais. Kortelės duomenų laišku neprašome.'},
];
const body=structuredClone(old.body),at=body.findIndex(b=>b.type==='heading'&&b.text==='Duomenų gavėjai');
assert.ok(at>0);body.splice(at,0,...added);
if(phase==='draft'){
 const site=await model.getSite('memocasting'),p=site.pages.find(p=>p.id===id);assert.equal(model.revisionHash(p),old.revisionHash);
 await fs.writeFile(qa+'/recovery-before-package.private.json',baselineBytes,{flag:'wx'});
 const next=await model.editPage('memocasting',id,{body});assert.deepEqual(next.body,body);
}
if(phase==='release'){
 const inspected=JSON.parse(await fs.readFile(qa+'/recovery-privacy-preview.private.json','utf8'));
 const site=await model.getSite('memocasting'),p=site.pages.find(p=>p.id===id);assert.deepEqual(p.body,body);assert.equal(inspected.revisionHash,model.revisionHash(p));
 await model.recordEditorialReview('memocasting',id,{revisionHash:model.revisionHash(p),reviewer:'payment-recovery-editor-20261025',evidence:{
  usefulness:'Added exact timing, data/purpose/basis, objection contact and the difference between a 24h stock reservation and a 30day limited continuation link. Original entire privacy page retained.',
  facts:'New source tests prove one12h reminder/future informed orders only, opt-in24h window, no send on paid/withdrawn/expired state, no email-field-only capture, HMAC30day capability and fresh quote/terms on expired restoration. These features remain disabled until this reviewed frontend/privacy release is hosted. Complete existing text checked; one-hour browser interrupted-request cache is a separate unchanged technical retention.',
  sources:'VDAI2025-11-20 consultation on abandoned-cart reminders, page5 of PDF (zero-based4), retrieved2026-10-25: systemic, impersonal, once within24h, no offers/pressure, GDPR information and individual context still apply. Source URL retained in PAYMENT_RECOVERY documentation. Legitimate-interest purpose documented narrowly; not marketing consent.',
  media:'No decorative image for a privacy policy; its existing empty media inventory is retained.',
  links:'All existing internal IDs and external primary privacy sources retained. Contact address agrees with owner-approved authenticated primary sender.',
  presentation:'Read the complete final Lithuanian privacy text and separately self-edited new paragraphs for grammar, conditional meaning, timing and units. Actual native current-draft desktop/mobile preview recorded in recovery-privacy-preview.private.json; final common frontend acceptance follows deployment.',
 }});
 await model.approveReviewedBatch('memocasting',[id],'payment-recovery-editor-20261025');
 const release=await model.releaseContent('memocasting'),next=JSON.parse(await fs.readFile(release.path));assert.equal(next.pages.length,baseline.pages.length);
 for(const p of baseline.pages){const n=next.pages.find(n=>n.id===p.id);if(p.id===id){assert.deepEqual(n.body,body);assert.equal(n.publishAt,p.publishAt);assert.deepEqual(n.links,p.links);assert.deepEqual(n.media,p.media);}else assert.deepEqual(n,p);}
 await fs.writeFile(qa+'/recovery-native-release.private.json',JSON.stringify({...release,changedPage:id,unrelatedPagesPreserved:186,datesPreserved:true},null,2));console.log(JSON.stringify(release));
}
console.log(JSON.stringify({phase,id,revisionHash:model.revisionHash((await model.getSite('memocasting')).pages.find(p=>p.id===id)),addedParagraphs:3}));
