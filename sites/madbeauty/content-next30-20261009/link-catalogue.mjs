import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const here=new URL('.',import.meta.url),sel=JSON.parse(await fs.readFile(new URL('SELECTION.json',here),'utf8'));
process.env.STUDIO_DATA_DIR=sel.privateStudio;process.env.STUDIO_OUTPUT_DIR=sel.privateStudio+'/output';
const primary='C:/Users/Lenovo/Documents/Nisiniai_puslapiai/nisiniai_puslapiai_monetizavimui';
const {getSite,listJobs,editPage}=await import('file:///'+primary+'/content-studio/src/model.mjs');
if((await listJobs()).some(j=>j.siteId==='madbeauty'&&['running','queued'].includes(j.status)))throw Error('Writer active');
const mapping={
 AN:['antakiai'],BL:['blakstienu-prieziura-blakstienu-laminavimas','blakstienu-priauginimas'],BR:['barzda'],DP:['depiliacija-vasku','depiliacija-cukrumi'],DZ:['plauku-dazymas'],GL:['lakavimas-gelinis-lakavimas'],MN:['manikiuras','lakavimas-gelinis-lakavimas'],NP:['nagu-modeliavimas'],PD:['pedikiuras'],PP:['plauku-proceduros'],ND:['nagu-dizainas']
};
const specific={'BR-gidas':['kirpimai-vyru-kirpimas','barzda'],'AN-korekcija-ar-dazymas':['antakiu-korekcija','antakiu-dazymas']};
const ids=[...new Set(sel.pages.flatMap(i=>specific[i.planId]||mapping[i.planId.split('-')[0]]||[]))];
const response=await fetch('https://madbeauty.lt/content-targets.json'),bytes=Buffer.from(await response.arrayBuffer()),registry=JSON.parse(bytes.toString('utf8'));
if(!response.ok||!registry.deployed||Date.parse(registry.expiresAt)<Date.now())throw Error('Fresh deployed registry required');
const results=await Promise.all(ids.map(async id=>{
 const route=registry.routes.find(r=>r.taxonomyNodeId===id&&r.cityId===null),t=registry.targets.find(t=>t.id==='mb:catalog:'+id);
 if(!route||route.status!=='ready'||!route.deployed||!route.reachable||t?.status!=='ready'||t.purpose!=='information')throw Error('Unready target '+id);
 const r=await fetch(route.canonicalUrl),raw=await r.text();
 const canonical=raw.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1];
 if(!r.ok||canonical!==route.canonicalUrl)throw Error('Category HTTP/canonical mismatch '+id);
 return {id:t.id,url:route.canonicalUrl,label:route.label,relationship:'Procedūros aprašas padeda susieti straipsnyje aptartą pasirinkimą su realia katalogo kategorija; teikėjo pasiūla ir miestas tikrinami atskirai.',verified:true,checkedAt:new Date().toISOString(),evidence:{httpStatus:r.status,canonical,indexEligible:route.indexEligible,purpose:t.purpose,htmlSha256:createHash('sha256').update(raw).digest('hex'),emptySupply:/šiuo metu|dar nėra|nėra viešų/i.test(raw)}};
}));
await fs.writeFile(new URL('CATALOGUE-TARGETS.json',here),JSON.stringify({checkedAt:new Date().toISOString(),registrySha256:createHash('sha256').update(bytes).digest('hex'),expiresAt:registry.expiresAt,cityTargets:registry.routes.filter(r=>r.cityId&&r.status==='ready').length,scope:'Actual production national information targets; no city or booking availability claimed',targets:results},null,2)+'\n');
for(const item of sel.pages){
 const destinations=(specific[item.planId]||mapping[item.planId.split('-')[0]]||[]).map(id=>results.find(r=>r.id==='mb:catalog:'+id));if(!destinations.length)continue;
 const p=(await getSite('madbeauty')).pages.find(p=>p.id===item.pageId);
 const content=[{type:'text',text:'Palyginkite procedūrų aprašus kataloge: '}];
 destinations.forEach((t,index)=>{if(index)content.push({type:'text',text:' ir '});content.push({type:'link',text:t.label,target:{kind:'commerce',targetId:t.id}});});
 content.push({type:'text',text:'. Konkrečią darbų apimtį, kainą ir prieinamumą tikrinkite prie realaus teikėjo pasiūlymo.'});
 if(p.body.some(b=>b.content?.some(n=>n.target?.kind==='commerce'&&destinations.some(t=>t.id===n.target.targetId))))continue;
 await editPage('madbeauty',p.id,{body:[...p.body,{type:'richParagraph',content}],editorial:{...p.editorial,commerceTargets:destinations.map(({evidence,...snapshot})=>snapshot)}});
}
console.log(JSON.stringify({verifiedNationalTargets:results.length,cityTargets:0,claim:'Information routes, not provider/booking availability'}));
