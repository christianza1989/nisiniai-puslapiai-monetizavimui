import {ownerContact} from './OWNER-FACTS.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pages,blockedLegacy} from './CONTENT.mjs';
import {localizedPages} from './LOCALIZED-CONTENT.mjs';
const definitions=[...pages,...localizedPages];
process.env.STUDIO_DATA_DIR=new URL('./studio-data/',import.meta.url).pathname.replace(/^\/(\w:)/,'$1');
process.env.STUDIO_OUTPUT_DIR=new URL('./studio-output/',import.meta.url).pathname.replace(/^\/(\w:)/,'$1');
const model=await import('../../content-studio/src/model.mjs');
const {initialize,listSites,createSite,editSite,getSite,addPage,editPage,saveResponsiveAsset,revisionHash,recordEditorialReview,approveReviewedBatch,releaseContent}=model;
const phase=process.argv[2]||'prepare',id='memocasting';
await initialize();if(!(await listSites()).some(s=>s.id===id))await createSite({siteId:id,canonicalHost:'memocasting.lt',name:'Memocasting',offer:'Rankų liejimo rinkiniai porai ir šeimai. Prisiminimas, kurį kuriate kartu.'});
if(phase==='prepare'){
 await editSite(id,{contact:ownerContact,facts:'Owner2026-10-11: MB Memocasting, non-VAT stated. Owner2026-10-14: Couple32EUR andfamily48EUR, whitepaintincludedboth; no paidpaintvariant. No verified safety/dispatch/legalID/provider/contact delivery. Owner2026-10-12 company306026827/info@memorycasting.lt/+37069108251; contact/return/send addressMolynės2C02211, registered address role pending. Sticks included; optionalwood+10EUR; base package data not extended to extras.',audience:'Poros ir šeimos, ieškančios bendros veiklos dovanos',brand:{accent:'#97452f'},contentPolicy:{months:6,cadence:'monthly',articlesPerMonth:5,localTime:'10:00',timezone:'Europe/Vilnius'}});
 let site=await getSite(id);const assets={};
 const media=[['gift','Dviejų suaugusiųjų susikibusios rankos prie tuščio dovanų laiško; redakcinė iliustracija.'],['planning','Tuščias planavimo sąsiuvinis, pieštukas ir dovanų kortelė; redakcinė iliustracija.'],['comparison','Atvira kūrybos priemonių dėžutė ir supakuota dovana; redakcinė palyginimo iliustracija.']];
 for(const [key,alt] of media){const existing=site.assets.filter(a=>a.alt===alt);const family=existing.length?existing:(await saveResponsiveAsset(id,{mime:'image/png',alt,rights:'Originali AI redakcinė iliustracija, sugeneruota šiam projektui; ne produktas ar kliento nuotrauka.',prompt:`Original editorial ${key} scene for shared-gift planning; no Memocasting product, stock, customer, safety or packaging representation.`},await readFile(new URL(`./media-originals/${key}.png`,import.meta.url)))).variants;assets[key]=family.map(a=>({id:a.id}));}
 media.push(['finishing','Baltas ir bronzos spalvos keraminiai pavyzdžiai su teptuku; redakcinė apdailos pasirinkimo iliustracija.'],['drying','Trys tuščios kortelės, laikrodis ir pieštukas; redakcinė proceso planavimo iliustracija.'],['diagnostics','Tuščias užrašų sąsiuvinis, lupa ir keraminiai pavyzdžiai; redakcinė stebėjimų užrašymo iliustracija.']);
 for(const [key,alt] of media.slice(3)){const existing=site.assets.filter(a=>a.alt===alt);const family=existing.length?existing:(await saveResponsiveAsset(id,{mime:'image/png',alt,rights:'Originali AI redakcinė iliustracija; ne Memocasting produktas, bandymas ar kliento rezultatas.',prompt:JSON.parse(await readFile(new URL('./EDITORIAL-IMAGE-PROMPTS.json',import.meta.url),'utf8'))[key]},await readFile(new URL(`./media-originals/${key}.png`,import.meta.url)))).variants;assets[key]=family.map(a=>({id:a.id}));}
 for(const entry of JSON.parse(await readFile(new URL('./OWNER-ASSETS.json',import.meta.url),'utf8')).entries)assets[entry.key]=entry.variantIds.map(id=>({id}));
 for(const entry of JSON.parse(await readFile(new URL('./NATIVE-ASSETS.json',import.meta.url),'utf8')).entries)assets[entry.key]=entry.variantIds.map(id=>({id}));
 const ids={};
 for(const def of definitions){site=await getSite(id);let current=site.pages.find(p=>p.slug===def.slug);if(!current)current=await addPage(id,{...def,publishAt:new Date().toISOString()});ids[def.slug]=current.id;}
 for(const def of definitions)await editPage(id,ids[def.slug],{type:def.type,title:def.title,description:def.description,intent:def.intent,body:def.body.map(b=>b.type==='image'&&assets[b.assetId]?{...b,assetId:assets[b.assetId][0].id}:b),links:(def.links||[]).map(([slug,label])=>({targetPageId:ids[slug],label})),media:[...(def.image?assets[def.image]:[]),...(def.additionalImages||[]).flatMap(key=>assets[key])],externalLinks:def.sources||[],factChecks:[],...(!site.pages.find(p=>p.id===ids[def.slug])?.publishedRevision?{publishAt:new Date().toISOString()}: {})});
 for(const slug of blockedLegacy){site=await getSite(id);if(!site.pages.some(p=>p.slug===slug)){const p=await addPage(id,{slug,type:'product',title:'Istorinis adresas — faktai tikslinami',description:'Privatus istorinio produkto dokumentavimo įrašas.',body:[{type:'paragraph',text:'Ankstesnis SKU nepatvirtintas dabartinei prekybai.'}]});await editPage(id,p.id,{factChecks:['Reikia Shopify eksporto ir savininko/tiekėjo patvirtinimo; neparduoti ir nenukreipti į nesusijusį produktą.']});}}
 site=await getSite(id);const selected=site.pages.filter(p=>definitions.some(d=>d.slug===p.slug));
 await writeFile(new URL('./REVIEW-TEXTS.private.md',import.meta.url),selected.map(p=>`# ${p.slug||'/'}\nRevision: ${revisionHash(p)}\nTitle: ${p.title}\nDescription: ${p.description}\n\n${p.body.map(b=>b.text||b.items?.join('\n')||'').join('\n\n')}\n\nLinks: ${JSON.stringify(p.links)}\nSources: ${JSON.stringify(p.externalLinks)}\nMedia: ${JSON.stringify(p.media.map(m=>({id:m.id,alt:m.alt,credit:m.credit,width:m.width,height:m.height})))}\n`).join('\n---\n'));
 await writeFile(new URL('./REVIEW-QUEUE.json',import.meta.url),JSON.stringify(selected.map(p=>({slug:p.slug,pageId:p.id,revisionHash:revisionHash(p),textSha256:createHash('sha256').update(JSON.stringify({title:p.title,description:p.description,body:p.body})).digest('hex')})),null,2));
 console.log(JSON.stringify({phase,siteId:id,prepared:selected.length,privateLegacy:blockedLegacy.length,reviewText:'sites/memocasting/REVIEW-TEXTS.private.md'}));
}else if(phase==='release'){
 const site=await getSite(id),reviews=JSON.parse(await readFile(new URL('./EDITORIAL-REVIEW.private.json',import.meta.url),'utf8'));
 const selected=site.pages.filter(p=>definitions.some(d=>d.slug===p.slug));
 for(const page of selected){const review=reviews.find(r=>r.slug===page.slug);if(!review||review.revisionHash!==revisionHash(page))throw Error('Missing/stale actual full-text review: '+page.slug);await recordEditorialReview(id,page.id,review);}
 const changed=selected.filter(p=>p.publishedRevision?.revisionHash!==revisionHash(p));
 if(changed.length)await approveReviewedBatch(id,changed.map(p=>p.id),'memocasting-editorial-agent');
 const result=await releaseContent(id);await writeFile(new URL('./LATEST-RELEASE.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}else throw Error('Allowed phases: prepare / release. Release requires actual revision-bound review file.');
