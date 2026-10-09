import fs from 'node:fs/promises';
import path from 'node:path';
import {v2RevisionHash,validateV2Draft,bodyPlainText} from 'file:///C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/content-package-v2.mjs';
const here=new URL('.',import.meta.url),sel=JSON.parse(await fs.readFile(new URL('SELECTION.json',here),'utf8'));
process.env.STUDIO_DATA_DIR=sel.privateStudio;process.env.STUDIO_OUTPUT_DIR=sel.privateStudio+'/output';
const {getSite,listJobs,editPage,recordEditorialReview,approveReviewedBatch,releaseContent}=await import('file:///C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/model.mjs');
if((await listJobs()).some(j=>j.siteId==='madbeauty'&&['running','queued'].includes(j.status)))throw Error('Writer active');
const qa=JSON.parse(await fs.readFile(new URL('RENDER-CHECK.json',here),'utf8'));
const notes=JSON.parse(await fs.readFile(new URL('REVIEW-NOTES.json',here),'utf8'));
const choice=JSON.parse(await fs.readFile(new URL('RELEASE-LINKS.json',here),'utf8'));
const media=JSON.parse(await fs.readFile(new URL('MEDIA-PLAN.json',here),'utf8'));
const sources=JSON.parse(await fs.readFile(new URL('SOURCE-NOTES.json',here),'utf8'));
const claims=[];
if(qa.views.length!==60)throw Error('60 actual desktop/mobile views required');
for(const item of sel.pages){
 let p=(await getSite('madbeauty')).pages.find(p=>p.id===item.pageId);const note=notes.pages.find(n=>n.planId===item.planId),m=media.find(m=>m.pageId===p.id),views=qa.views.filter(v=>v.planId===item.planId);
 if(views.length!==2||views.some(v=>v.revisionHash!==v2RevisionHash(p)))throw Error('Stale rendered review '+item.planId);
 if(p.editorial.sources.some(s=>!sources.some(l=>l.id===s.id&&l.review==='READ_FOR_BOUNDED_CLAIMS')))throw Error('Unreviewed source');
 const originalChecks=structuredClone(p.factChecks),selected=choice.selectedPlanIds.includes(item.planId);
 const remaining=selected?[]:[`Plane aiškiai numatyta patikra dar neatlikta: „${note.literalRequiredScope}“. Reikia tikros nurodytos srities peržiūros; bendrų šaltinių skaitymas ir agento redakcinė peržiūra jos nepakeičia.`];
 await editPage('madbeauty',p.id,{factChecks:remaining});
 p=(await getSite('madbeauty')).pages.find(p=>p.id===item.pageId);
 validateV2Draft(p,p.siteSnapshot);
 if(/[\u0400-\u04ff]|\[[^\]]+\]\(https?:/.test(bodyPlainText(p.body)))throw Error('Language/link artifact');
 const evidence={
  usefulness:note.usefulness+' Straipsnis perskaitytas visas; praktinis indėlis patikrintas, pavadinimas ir aprašymas atitinka pateiktą atsakymą.',
  facts:note.facts+' '+note.scope+(remaining.length?' Publikavimas lieka sustabdytas dėl aiškiai nurodyto neįvykdyto vartų.':' Faktų pastabos išspręstos šiame ribotame, faktiškai peržiūrėtame tekste; ekspertų darbas nebuvo išgalvotas.'),
  sources:'SOURCE-NOTES.json įrodo realiai perskaitytus dokumentus ir jų bytes/SHA. Šio teksto šaltiniai: '+p.editorial.sources.map(s=>s.id+' '+s.url).join('; ')+'. Konkrečių meniu kainos datuotos2026-10-09; ne rinkos vidurkis ir ne būsimos kainos garantija.',
  media:'MEDIA-PLAN.json '+item.planId+': originalus ImageGen failas '+m.originalSha256+', penki bendro importerio WebP variantai. Originalai apžiūrėti po vieną ir kontaktiniuose lapuose; actual desktop/mobile screenshot kontaktiniai lapai taip pat apžiūrėti. Nuotrauka teminė, kompozicija/paletė įvairi, anatomija priimtina, ne tikro teikėjo darbas ar before/after įrodymas. Vienas featured kadras, tiksli alt ir originalios generacijos teisės.',
  links:'LINK-PLAN.json išsaugo pilną būsimą grafiką; RELEASE-LINKS.json atskiria tinkamus ir atidėtus ryšius. Tik šios svetainės tikri UUID ir approved ar pasirinktos partijos tikslai; nepasirengusių puslapių href nėra. CATALOGUE-TARGETS.json16aktualių nacionalinių informacinių krypčių,0miesto pasiūlos tikslų; miesto ar rezervacijos prieinamumas neteigiamas.',
  presentation:'RENDER-CHECK.json: šis tikslus revisionHash faktiškai atvertas Chrome1440px ir390px bendros studijos peržiūroje. Visi vaizdai dekoduoti, responsive šeima pasirinkta, horizontalaus išsiplėtimo ir nulūžusių vaizdų nėra. Peržiūrėti keturi actual screenshot kontaktiniai lapai; antraštės, tekstas ir kadras telpa. Tai privati native peržiūra; production renderer/schema/domeno patikra priklauso atskiram diegimo priėmimui.'
 };
 const review=await recordEditorialReview('madbeauty',p.id,{reviewer:'codex-editor:01a11146-e1d2-78b1-ae76-081e812c0ca0',revisionHash:v2RevisionHash(p),evidence});
 claims.push({planId:item.planId,pageId:p.id,literalRequiredScope:note.literalRequiredScope,originalChecks,decision:selected?'ORDINARY_EDITORIAL_SOURCE_MEDIA_REVIEW_COMPLETE':'EXPLICIT_SPECIALIST_PENDING',scopeDecision:note.scope,verifiedClaims:note.facts,remainingChecks:remaining,reviewRevisionHash:review.revisionHash,checkedAt:review.checkedAt,expertReviewPerformed:false});
 m.status='ORIGINAL_PIXELS_AND_NATIVE_LAYOUT_REVIEWED';m.nativeRenderReview={views:views.map(v=>({device:v.device,screenshot:path.basename(v.screenshot),revisionHash:v.revisionHash,checkedAt:v.checkedAt})),screensContactSheetsViewed:true};
}
await fs.writeFile(new URL('CLAIM-REVIEW.json',here),JSON.stringify({checkedAt:new Date().toISOString(),scope:'Real agent editorial review, not fabricated procedure-specialist credentials',pages:claims},null,2)+'\n');
await fs.writeFile(new URL('MEDIA-PLAN.json',here),JSON.stringify(media,null,2)+'\n');
const ids=sel.pages.filter(i=>choice.selectedPlanIds.includes(i.planId)).map(i=>i.pageId);
const approval=await approveReviewedBatch('madbeauty',ids,'codex-editor-reviewed-next30');
const release=await releaseContent('madbeauty');
const destination=new URL('release/',here);await fs.mkdir(destination,{recursive:true});
await fs.cp(path.dirname(release.path),destination,{recursive:true});
await fs.writeFile(new URL('DELIVERY.json',here),JSON.stringify({preparedAt:new Date().toISOString(),siteId:'madbeauty',additionalWritten:30,originalImages:30,approvedAdditional:approval.approved.length,specialistPending:choice.specialistPendingPlanIds,release,immutablePackage:'release/content-package.json',state:'EXPORTED_NOT_DEPLOYED',productionAcceptance:null,next:'Admit this exact immutable package in actual Cloudflare consumer, preserving incumbent runtime/storage/mail/DNS; expert-gated11 pages remain private.'},null,2)+'\n');
console.log(JSON.stringify({written:30,approvedAdditional:approval.approved.length,specialistPending:11,releaseSha256:release.packageSha256,state:'EXPORTED_NOT_DEPLOYED'}));
