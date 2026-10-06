// Source-owned private pilot. Uses shared studio APIs; no approval or deployment.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
const [generatedDirectory,imageFile,privateStudio]=process.argv.slice(2);
if(!generatedDirectory||!imageFile||!privateStudio)throw Error('Usage: node bind-private-draft.mjs <CLI output> <inspected image> <NEW isolated studio directory>');
const here=import.meta.dirname,root=path.resolve(here,'../../..'),data=path.resolve(privateStudio);
if(existsSync(path.join(data,'sites','madbeauty.json')))throw Error('Destination occupied; review/resume existing draft instead of resetting it');
process.env.STUDIO_DATA_DIR=data;process.env.STUDIO_OUTPUT_DIR=path.join(data,'output');
const model=await import('../../../content-studio/src/model.mjs');
const {validateV2Draft,v2RevisionHash,v2RevisionPayload}=await import('../../../content-studio/src/content-package-v2.mjs');
const plan=JSON.parse(await readFile(path.join(here,'../topical-authority-20261006/PLAN.json'),'utf8'));
const brief=JSON.parse(await readFile(path.join(here,'REGISTRACIJOS-BRIEF.json'),'utf8'));
const draftRaw=await readFile(path.join(generatedDirectory,'article.json'),'utf8'),draft=JSON.parse(draftRaw);
const generation=JSON.parse(await readFile(path.join(generatedDirectory,'generation-receipt.json'),'utf8'));
if(generation.observed?.model!=='gpt-6-luna'||generation.observed.reasoningEffort!=='xhigh'||plan.pages.length!==300)throw Error('Actual writer receipt and complete source map required');
if(draft.blocks.some(b=>/\bdass\b/.test(b.text))||!draft.blocks.some(b=>b.type==='list'&&b.items.some(x=>x.includes('[įrašykite'))))throw Error('Reviewed language/template requirements unresolved');
if(draft.externalSources.some(s=>!brief.sourceNotes.some(n=>n.url===s.url)))throw Error('Unreviewed external source');
await mkdir(path.join(data,'sites'),{recursive:true});
let site=await model.createSite({canonicalHost:'madbeauty.lt',name:'Madbeauty',offer:'Grožio paslaugų paieška pagal miestą ir procedūrą.',schemaVersion:2,renderer:'niche'});
await model.initialize();
site=await model.editSite(site.id,{brand:{accent:'#7040E8'},contact:{email:'info@pinet.lt',phone:''},facts:'Savininko pasirinktas grožio paslaugų platformos projektas Madbeauty, operatorius MB Pinet. Ši privati redakcinė kopija neteigia konkrečios pasiūlos ar veikiančios registracijos.',contentPolicy:{cadence:'coverage',coverageTarget:303,months:6,localTime:'10:00'}});
const idMap=Object.fromEntries(plan.pages.map(p=>[p.id,randomUUID()]));
for(const p of plan.retained){const original=plan.existing.find(e=>e.id===p.id);idMap[p.id]=original.actualPageId;}
const all=[...plan.pages,...plan.retained];
for(const p of all)await model.addPage(site.id,{id:idMap[p.id],type:'guide',slug:p.slug,title:p.title,description:p.description||p.title,intent:p.intent||p.title,cluster:p.cluster||'Esamo gido atnaujinimas',publishAt:p.publishAt,reason:p.originalContribution||'Esamo gido peržiūros planas; istorinis patvirtinimas nekopijuojamas.'});
for(const p of plan.pages)if(p.parentId)await model.editPage(site.id,idMap[p.id],{pillarPageId:idMap[p.parentId]});
const imported=await model.saveResponsiveAsset(site.id,{mime:'image/png',alt:draft.imageBrief.alt,rights:'Originali AI sukurta redakcinė iliustracija šiam Madbeauty gidui; nėra tikro teikėjo ar vizito fotografija.',prompt:draft.imageBrief.prompt,credit:''},await readFile(imageFile));
const body=draft.blocks.map(b=>b.type==='heading'?{type:'heading',level:b.level,text:b.text}:b.type==='list'?{type:'list',items:b.items}:{type:'paragraph',text:b.text});
for(let i=0;i<body.length;i++){
 const b=body[i];if(b.type!=='paragraph')continue;
 const note=brief.sourceNotes.find(n=>b.text.includes(n.id==='S19'?'VVTAT':'NVSC')||n.id==='S19'&&b.text.includes('išsaugokite mokėjimo dokumentą'));if(!note)continue;
 body[i]={type:'richParagraph',content:[{type:'text',text:b.text+' Šaltinis: '},{type:'link',text:note.id==='S19'?'VVTAT':'NVSC',target:{kind:'external',url:note.url}}]};
}
const words=body.map(b=>b.text||b.content?.map(n=>n.text).join('')||b.items?.join('')||'').join(' ').split(/\s+/).length;
const sources=brief.sourceNotes.map(n=>({id:n.id,title:n.label,publisher:n.id==='S19'?'VVTAT':'NVSC',url:n.url,accessedAt:generation.finishedAt,public:true}));
const page=await model.editPage(site.id,idMap[brief.planId],{title:draft.title,description:draft.description,body,media:[{id:imported.id}],factChecks:[],externalLinks:draft.externalSources.map(s=>({...s,verified:true})),editorial:{category:'Registracija ir vizito pasirinkimas',readingMinutes:Math.max(1,Math.ceil(words/200)),authors:[{id:'madbeauty-redakcija',siteId:'madbeauty',locale:'lt-LT',slug:'redakcija',name:'Madbeauty redakcija',role:'Redakcinė komanda',bio:'MB Pinet administruojamo Madbeauty projekto informacinis turinys. Rengiant tekstą ir teminę iliustraciją naudotas dirbtinis intelektas; turinys peržiūrėtas redakciniame procese.',kind:'organization',sameAs:[]}],sources,datePublished:null,dateModified:null,productRecommendation:false,featuredImageId:imported.id,relatedPageIds:[],commerceTargets:[]}});
site=await model.getSite(site.id);validateV2Draft(page,page.siteSnapshot);
if(site.pages.length!==303||site.pages.some(p=>p.approval||p.publishedRevision))throw Error('Private materialization/approval boundary failed');
await mkdir(path.join(here,'assets'),{recursive:true});
const assetFiles=[];
for(const v of imported.variants){const filename=path.basename(v.src);await copyFile(path.join(data,'media','madbeauty',filename),path.join(here,'assets',filename));assetFiles.push({file:'assets/'+filename,width:v.width,height:v.height,bytes:v.bytes,sha256:v.sha256});}
await writeFile(path.join(here,'ARTICLE.json'),draftRaw);
await writeFile(path.join(here,'GENERATION-RECEIPT.json'),JSON.stringify({...generation,savedArticleSha256:createHash('sha256').update(draftRaw).digest('hex')},null,2)+'\n');
await writeFile(path.join(here,'IMAGE-PROMPT.txt'),draft.imageBrief.prompt+'\n');
await writeFile(path.join(here,'STUDIO-IDENTITY-MAP.json'),JSON.stringify({siteId:site.id,schemaVersion:2,pages:all.map(p=>({planId:p.id,pageId:idMap[p.id],slug:p.slug,publishAt:p.publishAt})),approvalState:'ALL_PRIVATE'},null,2)+'\n');
await writeFile(path.join(here,'DRAFT-V2.json'),JSON.stringify({status:'PRIVATE_DRAFT_NOT_APPROVED',page:v2RevisionPayload(page),revisionHash:v2RevisionHash(page)},null,2)+'\n');
await writeFile(path.join(here,'EXECUTION.json'),JSON.stringify({status:'ONE_REAL_PRIVATE_ARTICLE_WITH_MEDIA',siteId:site.id,planId:brief.planId,pageId:page.id,slug:page.slug,publishAt:page.publishAt,studioPages:site.pages.length,writtenPages:1,approvedPages:0,productionDeployed:false,v2Structure:'PASS',revisionHash:v2RevisionHash(page),writer:generation.observed,imageGenerator:'BUILT_IN_IMAGEGEN',mediaRole:draft.imageBrief.role,sourceSha256:imported.optimization.sourceBytes?createHash('sha256').update(await readFile(imageFile)).digest('hex'):null,assets:assetFiles,pendingLinks:plan.links.filter(l=>l.from===brief.planId).map(l=>({...l,targetPageId:idMap[l.to]||null})),limits:['Actual Madbeauty booking interface is deliberately outside this generic article.','Only one of 300 new articles is written; the other private records are plans.','No approval, public V2 import or deployment performed.','Scheduled public visibility still requires reviewed approval, exact package import/deployment and due date.']},null,2)+'\n');
console.log(JSON.stringify({siteId:site.id,pageId:page.id,studioPages:site.pages.length,variants:assetFiles.length,v2Structure:'PASS',approval:'NONE',privateStudio:data}));
