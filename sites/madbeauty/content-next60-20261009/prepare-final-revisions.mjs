import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
import {stableV2} from 'file:///C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/content-package-v2.mjs';
const here=new URL('.',import.meta.url),sel=JSON.parse(await fs.readFile(new URL('SELECTION.json',here),'utf8'));
process.env.STUDIO_DATA_DIR=sel.privateStudio;process.env.STUDIO_OUTPUT_DIR=sel.privateStudio+'/output';
const {getSite,listJobs,reconcilePrivatePlan}=await import('file:///C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/model.mjs');
if((await listJobs()).some(j=>j.siteId==='madbeauty'&&['running','queued'].includes(j.status)))throw Error('Writer active');
const site=await getSite('madbeauty');if(sel.pages.some(i=>!site.pages.find(p=>p.id===i.pageId).body.length))throw Error('Initial60 required');
const revisions=JSON.parse(await fs.readFile(new URL('REVISION-PLAN.json',here),'utf8')),notes=JSON.parse(await fs.readFile(new URL('SOURCE-NOTES.json',here),'utf8'));
const media=JSON.parse(await fs.readFile(new URL('MEDIA-PLAN.json',here),'utf8'));
const oldBodies=site.pages.map(p=>({id:p.id,body:p.body,publishAt:p.publishAt,publishedRevision:p.publishedRevision}));
const updates=site.pages.map(p=>{const i=sel.pages.find(i=>i.pageId===p.id),b=structuredClone(p.planningBrief.data);
 if(i){const extra=revisions[i.planId]?.sources||[];b.sourceIds=[...new Set([...(b.sourceIds||[]),...extra])];b.researchedClaims=b.sourceIds.map(id=>{const s=notes.find(x=>x.id===id);if(!s)throw Error('Unread '+id);return{id,url:s.url,sha256:s.sha256,note:s.note,reviewedAt:s.reviewedAt};});
  if(i.planId==='PD-kaina-trukme'){b.deliverables=['Datuotas vieno konkretaus pedikiūro meniu trijų variantų apimties, kainos ir rezervuojamo laiko palyginimas'];b.originalContribution='Vieno meniu darbų apimčių palyginimas, neskiriant iš bendro paketo nepagrįstų atskirų darbo tarifų';}
  if(i.planId==='ND-chrome-cat-eye'){b.deliverables=['Savais žodžiais paaiškintas chrome paviršiaus ir magnetinio cat-eye šviesos linijos skirtumas','Originali teminė abiejų efektų fotografijos iliustracija, ne teikėjo atlikto darbo įrodymas'];b.originalContribution='Dviejų efektų vizualinio palyginimo kortelė pagal šviesos atspindį ir matymo kampą';b.optionalDeferredEvidence='Tikro teikėjo vaizdo įrašas nepridėtas ir nežadamas; būtų naudojamas tik gavus tikrą failą ir teisę naudoti.';}
  if(['PD-kaina-trukme','ND-chrome-cat-eye'].includes(i.planId)){b.answerRequirements={...b.answerRequirements,deliverable:b.originalContribution};b.contentAcceptance={...b.contentAcceptance,workedExample:b.originalContribution};}
  b.media={...b.media,subject:media.find(m=>m.pageId===p.id).alt,role:'Originali fikcinė temos fotografijos iliustracija. Metodų skirtumai ir sprendimo kortelė aiškinami tekste; nuotrauka nėra techninis brėžinys, realaus teikėjo, kliento rezultato ar dokumento įrodymas.'};
 }
 return{pageId:p.id,slug:p.slug,brief:b,pillarPageId:p.pillarPageId||'',linkSuggestions:p.linkSuggestions||[]};});
const bytes=Buffer.from(JSON.stringify({updates,reason:'Scope-corrected real deliverables; source/date corrections, no invented provider video or second pedicure offer'},null,2)+'\n');await fs.writeFile(new URL('FINAL-REVISION-PLAN-INPUT.json',here),bytes);
const receipt=await reconcilePrivatePlan('madbeauty',{canonicalHost:site.canonicalHost,locale:site.locale,expectedSiteHash:createHash('sha256').update(stableV2(site)).digest('hex'),sourcePlanSha256:createHash('sha256').update(bytes).digest('hex'),skillFingerprint:site.pages.find(p=>p.planningBrief).planningBrief.skillFingerprint,coverageTarget:299,updates,retire:[]});
const final=await getSite('madbeauty');for(const old of oldBodies){const p=final.pages.find(p=>p.id===old.id);if(JSON.stringify({id:p.id,body:p.body,publishAt:p.publishAt,publishedRevision:p.publishedRevision})!==JSON.stringify(old))throw Error('Body/calendar/snapshot changed');}
await fs.writeFile(new URL('FINAL-REVISION-PREPARATION.json',here),JSON.stringify({preparedAt:new Date().toISOString(),receipt,all299DatesPreserved:true,allExistingBodiesPreserved:true,requiredRevisions:Object.keys(revisions).length},null,2)+'\n');console.log('Revision inputs prepared, existing bodies and exact calendar preserved.');
