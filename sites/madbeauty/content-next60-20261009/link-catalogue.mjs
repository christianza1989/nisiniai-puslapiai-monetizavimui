import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
const here=new URL('.',import.meta.url),sel=JSON.parse(await fs.readFile(new URL('SELECTION.json',here),'utf8'));
process.env.STUDIO_DATA_DIR=sel.privateStudio;process.env.STUDIO_OUTPUT_DIR=sel.privateStudio+'/output';
const {getSite,listJobs,editPage}=await import('file:///C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui/content-studio/src/model.mjs');
if((await listJobs()).some(j=>j.siteId==='madbeauty'&&['running','queued'].includes(j.status)))throw Error('Writer active');
const overrides={'VP-gidas':['veidas'],'KP-gidas':['kunas'],'LZ-lazeris-ipl':['plauku-salinimas-aparatu-fotoepiliacija','plauku-salinimas-aparatu-plauku-salinimas-lazeriu'],'DP-ar-lazeris':['depiliacija-vasku','depiliacija-cukrumi','plauku-salinimas-aparatu-plauku-salinimas-lazeriu']};
const idsFor=i=>overrides[i.planId]||i.brief.catalogueTargets?.map(t=>t.taxonomyNodeId)||[];
const response=await fetch('https://madbeauty.lt/content-targets.json',{cache:'no-store'}),bytes=Buffer.from(await response.arrayBuffer()),registry=JSON.parse(bytes.toString('utf8'));
if(!response.ok||!registry.deployed||Date.parse(registry.expiresAt)<Date.now())throw Error('Fresh actual deployed registry required');
const results=[],deferred=[];
for(const id of [...new Set(sel.pages.flatMap(idsFor))]){
 const route=registry.routes.find(r=>r.taxonomyNodeId===id&&r.cityId===null),target=registry.targets.find(t=>t.id==='mb:catalog:'+id);
 if(!route||route.status!=='ready'||!route.deployed||!route.reachable||target?.status!=='ready'||target.purpose!=='information'){deferred.push({taxonomyNodeId:id,status:route?.status||'not-in-registry',reason:'Actual canonical information route is not deployed ready; no live href fabricated.'});continue;}
 const r=await fetch(route.canonicalUrl),raw=await r.text(),canonical=raw.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1];
 if(!r.ok||canonical!==route.canonicalUrl)throw Error('Actual route HTTP/canonical mismatch '+id);
 results.push({id:target.id,url:route.canonicalUrl,label:route.label,relationship:'Straipsnyje aptartos procedūros aprašas; miestas ir realaus teikėjo pasiūlymas pasirenkami atskirai.',verified:true,checkedAt:new Date().toISOString(),evidence:{taxonomyNodeId:id,routeRegistryId:target.id,purpose:target.purpose,allowedQueryParams:target.allowedQueryParams||[],httpStatus:r.status,canonical,indexEligible:route.indexEligible,htmlSha256:createHash('sha256').update(raw).digest('hex')}});
}
const pages=[];
for(const item of sel.pages){
 const requested=idsFor(item),destinations=requested.map(id=>results.find(r=>r.id==='mb:catalog:'+id)).filter(Boolean),p=(await getSite('madbeauty')).pages.find(p=>p.id===item.pageId);
 pages.push({planId:item.planId,kept:destinations.map(t=>t.id),deferred:requested.filter(id=>!destinations.some(t=>t.id==='mb:catalog:'+id)).map(id=>deferred.find(d=>d.taxonomyNodeId===id))});
 if(!destinations.length)continue;
 const content=[{type:'text',text:'Procedūrų aprašai kataloge: '}];destinations.forEach((t,index)=>{if(index)content.push({type:'text',text:', '});content.push({type:'link',text:t.label,target:{kind:'commerce',targetId:t.id}});});content.push({type:'text',text:'. Miestą ir realaus teikėjo pasiūlymą pasirinkite kataloge, kai tokia pasiūla pateikta.'});
 const clean=p.body.filter(b=>!b.content?.some(n=>n.target?.kind==='commerce'));
 await editPage('madbeauty',p.id,{body:[...clean,{type:'richParagraph',content}],editorial:{...p.editorial,commerceTargets:destinations.map(({evidence,...snapshot})=>snapshot)}});
}
await fs.writeFile(new URL('CATALOGUE-TARGETS.json',here),JSON.stringify({checkedAt:new Date().toISOString(),registrySha256:createHash('sha256').update(bytes).digest('hex'),generatedAt:registry.generatedAt,expiresAt:registry.expiresAt,cityTargets:registry.routes.filter(r=>r.cityId&&r.status==='ready').length,scope:'Actual canonical national information routes. Planned procedures deferred; no test providers/city or booking availability claims.',targets:results,deferred,pages},null,2)+'\n');
console.log(JSON.stringify({verifiedNationalTargets:results.length,deferredTargets:deferred.length,linkedArticles:pages.filter(p=>p.kept.length).length,cityTargets:0}));
